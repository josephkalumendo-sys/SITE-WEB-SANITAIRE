$ErrorActionPreference = "Stop"

$rootOverride = [Environment]::GetEnvironmentVariable("RDC_PROJECT_ROOT")
if ($rootOverride) {
  $projectRoot = Resolve-Path $rootOverride
} else {
  $projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
}
$outputPath = Join-Path $projectRoot "data\daily-updates.js"
$existingTitleTranslations = @{}
if (Test-Path -LiteralPath $outputPath) {
  $existingContent = [System.IO.File]::ReadAllText($outputPath)
  if ($existingContent -match '(?s)^\s*window\.RDC_DAILY_UPDATES\s*=\s*(\{.*\})\s*;\s*$') {
    $existingUpdates = ConvertFrom-Json -InputObject $Matches[1]
  } else {
    throw "Le fichier des publications existant n’a pas le format attendu."
  }
  foreach ($existingItem in @($existingUpdates.items)) {
    if ($existingItem.url -and $existingItem.titleFr) {
      $existingTitleTranslations[[string]$existingItem.url] = [string]$existingItem.titleFr
    }
  }
}
$now = [DateTimeOffset]::UtcNow
$cutoff = $now.AddDays(-30)
$articles = [System.Collections.Generic.List[object]]::new()
$sourceStatuses = [System.Collections.Generic.List[object]]::new()
$healthPattern = "(?i)\b(outbreak|epidemic|epidemi\w*|\u00E9pid\u00E9mi\w*|health|disease|Ebola|cholera|mpox|measles|polio|malaria|HIV|vaccin|sanitaire|sant(e|\u00E9)|maladie)\b"
$drcPattern = "(?i)Democratic Republic of the Congo|DR Congo|\bDRC\b|\bRDC\b|Congo-Kinshasa|Kinshasa|Ituri|Lualaba|Haut-Katanga|Nord-Kivu|North Kivu|Sud-Kivu|South Kivu|Equateur|\u00C9quateur|Kasai|Kasa\u00EF|Kwilu|Tshopo"
$epidemicPattern = "(?i)\b(outbreak\w*|epidem\w*|\u00E9pid\u00E9mi\w*|cluster\w* of (cases|infection\w*)|Ebola|Bundibugyo|chol[e\u00E9]ra|mpox|monkey\s?pox|variole du singe|measles|rougeole|polio\w*|poliomy[e\u00E9]lite|meningit\w*|fi[e\u00E8]vre jaune|yellow fever|peste|plague|dengue|chikungunya|Marburg|Rift Valley fever|fi[e\u00E8]vre h[e\u00E9]morragique|viral hemorrhagic fever)\b"
$provinceAliases = @{
  "Bas-Uele" = @("Bas-Uele", "Bas Uele", "Lower Uele")
  "Équateur" = @("Équateur", "Equateur")
  "Haut-Katanga" = @("Haut-Katanga", "Haut Katanga", "Upper Katanga")
  "Haut-Lomami" = @("Haut-Lomami", "Haut Lomami", "Upper Lomami")
  "Haut-Uele" = @("Haut-Uele", "Haut Uele", "Upper Uele")
  "Ituri" = @("Ituri")
  "Kasaï" = @("Kasaï", "Kasai")
  "Kasaï-Central" = @("Kasaï-Central", "Kasai-Central", "Kasai Central", "Central Kasai")
  "Kasaï-Oriental" = @("Kasaï-Oriental", "Kasai-Oriental", "Kasai Oriental", "East Kasai")
  "Kinshasa" = @("Kinshasa")
  "Kongo-Central" = @("Kongo-Central", "Kongo Central", "Bas-Congo", "Lower Congo")
  "Kwango" = @("Kwango")
  "Kwilu" = @("Kwilu")
  "Lomami" = @("Lomami")
  "Lualaba" = @("Lualaba")
  "Mai-Ndombe" = @("Mai-Ndombe", "Mai Ndombe", "Maï-Ndombe", "Maï Ndombe")
  "Maniema" = @("Maniema")
  "Mongala" = @("Mongala")
  "Nord-Kivu" = @("Nord-Kivu", "Nord Kivu", "North Kivu")
  "Nord-Ubangi" = @("Nord-Ubangi", "Nord Ubangi", "North Ubangi")
  "Sankuru" = @("Sankuru")
  "Sud-Kivu" = @("Sud-Kivu", "Sud Kivu", "South Kivu")
  "Sud-Ubangi" = @("Sud-Ubangi", "Sud Ubangi", "South Ubangi")
  "Tanganyika" = @("Tanganyika")
  "Tshopo" = @("Tshopo")
  "Tshuapa" = @("Tshuapa")
}

function Get-MentionedProvinces {
  param([Parameter(Mandatory = $true)][AllowEmptyString()][string]$Text)

  $mentioned = [System.Collections.Generic.List[string]]::new()
  foreach ($province in ($provinceAliases.Keys | Sort-Object)) {
    $aliases = @($provinceAliases[$province] | ForEach-Object { [Regex]::Escape($_) })
    $pattern = "(?i)(?<![\p{L}\p{N}-])(?:$($aliases -join '|'))(?![\p{L}\p{N}-])"
    if ($Text -match $pattern) {
      $mentioned.Add($province)
    }
  }
  return $mentioned.ToArray()
}

function Add-RssSource {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$SourceName,
    [Parameter(Mandatory = $true)][string]$Category,
    [Parameter(Mandatory = $true)][string]$HealthFilter,
    [Parameter(Mandatory = $true)][string]$LocationFilter,
    [Parameter(Mandatory = $true)][string]$EpidemicFilter,
    [switch]$Required
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -Headers @{
      "User-Agent" = "RDC-Health-Surveillance/1.0"
      "Accept" = "application/rss+xml, application/xml"
    } -TimeoutSec 30 -UseBasicParsing
    [xml]$feed = $response.Content
    $added = 0

    foreach ($item in @($feed.SelectNodes("/rss/channel/item"))) {
      $title = [System.Net.WebUtility]::HtmlDecode([string]$item.title).Trim()
      $descriptionNode = $item.SelectSingleNode("./description")
      $description = if ($descriptionNode) {
        [System.Net.WebUtility]::HtmlDecode([string]$descriptionNode.InnerText)
      } else {
        ""
      }
      $searchText = "$title $description"
      if ($searchText -notmatch $HealthFilter -or $searchText -notmatch $LocationFilter -or $searchText -notmatch $EpidemicFilter) {
        continue
      }

      $publishedText = [string]$item.pubDate
      if (-not $publishedText) {
        $dateNode = $item.SelectSingleNode("./*[local-name()='date']")
        if ($dateNode) {
          $publishedText = $dateNode.InnerText
        }
      }
      try {
        $publishedAt = [DateTimeOffset]::Parse($publishedText).ToUniversalTime()
      } catch {
        continue
      }
      if ($publishedAt -lt $cutoff -or $publishedAt -gt $now.AddDays(1)) {
        continue
      }

      $articleUrl = ([string]$item.link).Trim()
      if (-not $articleUrl.StartsWith("https://", [StringComparison]::OrdinalIgnoreCase)) {
        continue
      }

      $articles.Add([pscustomobject]@{
        title = $title
        titleFr = if ($existingTitleTranslations.ContainsKey($articleUrl)) { $existingTitleTranslations[$articleUrl] } else { $null }
        url = $articleUrl
        publishedAt = $publishedAt.ToString("o")
        source = $SourceName
        publisher = $SourceName
        category = $Category
        epidemicRelated = $true
        provinces = @(Get-MentionedProvinces -Text $searchText)
      })
      $added++
    }

    $sourceStatuses.Add([pscustomobject]@{
      name = $SourceName
      state = "updated"
      message = if ($added -eq 1) { "1 publication récente trouvée." } else { "$added publications récentes trouvées." }
    })
  } catch {
    $sourceStatuses.Add([pscustomobject]@{
      name = $SourceName
      state = "error"
      message = "Cette source n’a pas pu être actualisée aujourd’hui."
    })
    Write-Warning "$SourceName did not respond; request details are not logged."
    if ($Required) {
      throw "Required official source $SourceName is unavailable."
    }
  }
}

function Add-NewsApiSource {
  param(
    [Parameter(Mandatory = $true)][string]$SourceName,
    [Parameter(Mandatory = $true)][AllowEmptyString()][string]$ApiKey,
    [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Url,
    [Parameter(Mandatory = $true)][string]$ResultsProperty,
    [Parameter(Mandatory = $true)][string]$Category
  )

  if (-not $ApiKey) {
    $sourceStatuses.Add([pscustomobject]@{
      name = $SourceName
      state = "not_configured"
      message = "Ajoutez la clé d’API correspondante aux secrets GitHub pour activer ce flux."
    })
    return
  }

  try {
    $response = Invoke-RestMethod -Uri $Url -TimeoutSec 30
    if ($response.status -eq "error" -or $response.status -eq "failed") {
      throw "$SourceName returned an API error."
    }
    $records = @($response.$ResultsProperty)
    $added = 0
    foreach ($record in $records) {
      $title = [string]$record.title
      $searchText = @(
        $title
        [string]$record.description
        [string]$record.content
      ) -join " "
      if ($searchText -notmatch $healthPattern -or $searchText -notmatch $drcPattern -or $searchText -notmatch $epidemicPattern) {
        continue
      }

      $articleUrl = if ($SourceName -eq "GNews") { [string]$record.url } else { [string]$record.link }
      $dateText = if ($SourceName -eq "GNews") { [string]$record.publishedAt } else { [string]$record.pubDate }
      if (-not $title -or -not $articleUrl.StartsWith("https://", [StringComparison]::OrdinalIgnoreCase)) {
        continue
      }

      try {
        $publishedAt = [DateTimeOffset]::Parse($dateText).ToUniversalTime()
      } catch {
        continue
      }
      if ($publishedAt -lt $cutoff -or $publishedAt -gt $now.AddDays(1)) {
        continue
      }

      $publisher = if ($SourceName -eq "GNews") {
        [string]$record.source.name
      } else {
        [string]$record.source_name
      }
      $articles.Add([pscustomobject]@{
        title = $title
        titleFr = if ($existingTitleTranslations.ContainsKey($articleUrl)) { $existingTitleTranslations[$articleUrl] } else { $null }
        url = $articleUrl
        publishedAt = $publishedAt.ToString("o")
        source = $SourceName
        publisher = $publisher
        category = $Category
        epidemicRelated = $true
        provinces = @(Get-MentionedProvinces -Text $searchText)
      })
      $added++
    }

    $sourceStatuses.Add([pscustomobject]@{
      name = $SourceName
      state = "updated"
      message = if ($added -eq 1) { "1 publication récente trouvée." } else { "$added publications récentes trouvées." }
    })
  } catch {
    $sourceStatuses.Add([pscustomobject]@{
      name = $SourceName
      state = "error"
      message = "Ce flux d’API n’a pas pu être actualisé aujourd’hui."
    })
    Write-Warning "$SourceName did not respond; request details are not logged."
  }
}

$whoUrl = "https://www.afro.who.int/rss.xml"
$reliefWebUrl = "https://reliefweb.int/updates/rss.xml?search=Democratic%20Republic%20of%20the%20Congo%20health"
Add-RssSource -Url $whoUrl -SourceName "OMS Afrique" -Category "official" -HealthFilter $healthPattern -LocationFilter $drcPattern -EpidemicFilter $epidemicPattern -Required
Add-RssSource -Url $reliefWebUrl -SourceName "ReliefWeb" -Category "humanitarian" -HealthFilter $healthPattern -LocationFilter $drcPattern -EpidemicFilter $epidemicPattern

$gnewsKey = [Environment]::GetEnvironmentVariable("GNEWS_API_KEY")
if ($gnewsKey) {
  $gnewsQuery = [Uri]::EscapeDataString("DR Congo OR DRC OR RDC OR Ituri health OR Ebola OR cholera OR mpox")
  $gnewsUrl = "https://gnews.io/api/v4/search?q=$gnewsQuery&lang=en&max=10&apikey=$([Uri]::EscapeDataString($gnewsKey))"
} else {
  $gnewsUrl = ""
}
Add-NewsApiSource -SourceName "GNews" -ApiKey $gnewsKey -Url $gnewsUrl -ResultsProperty "articles" -Category "media"

$newsDataKey = [Environment]::GetEnvironmentVariable("NEWSDATA_API_KEY")
if ($newsDataKey) {
  $newsDataQuery = [Uri]::EscapeDataString("DR Congo OR DRC OR RDC OR Ituri OR Ebola OR cholera OR mpox")
  $newsDataUrl = "https://newsdata.io/api/1/latest?apikey=$([Uri]::EscapeDataString($newsDataKey))&q=$newsDataQuery&language=en,fr"
} else {
  $newsDataUrl = ""
}
Add-NewsApiSource -SourceName "NewsData.io" -ApiKey $newsDataKey -Url $newsDataUrl -ResultsProperty "results" -Category "media"

$uniqueArticles = [System.Collections.Generic.List[object]]::new()
$seenUrls = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($article in @($articles | Sort-Object { [DateTimeOffset]::Parse($_.publishedAt) } -Descending)) {
  if ($seenUrls.Add($article.url)) {
    $uniqueArticles.Add($article)
  }
}

$payload = [ordered]@{
  updatedAt = $now.ToString("o")
  items = @($uniqueArticles | Select-Object -First 40)
  sources = @($sourceStatuses)
}
$json = ConvertTo-Json -InputObject $payload -Depth 8
$javascript = "window.RDC_DAILY_UPDATES = $json;"
[System.IO.File]::WriteAllText($outputPath, $javascript, [System.Text.UTF8Encoding]::new($false))
Write-Output "Daily health feed refreshed: $($uniqueArticles.Count) article(s), $($sourceStatuses.Count) source(s)."
