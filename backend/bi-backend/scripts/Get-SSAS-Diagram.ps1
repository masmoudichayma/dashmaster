param(
    [string]$ServerName = "DESKTOP-QBV33CS",
    [string]$DatabaseName,
    [string]$CubeName
)

try {
    [System.Reflection.Assembly]::LoadWithPartialName("Microsoft.AnalysisServices") | Out-Null
    
    $server = New-Object Microsoft.AnalysisServices.Server
    $server.Connect($ServerName)
    
    $database = $server.Databases[$DatabaseName]
    $cube = $database.Cubes[$CubeName]
    
    # Récupérer la table de faits
    $factTable = @{
        name = "Fact Table"
        type = "fact"
        measureGroups = @()
    }
    
    foreach ($mg in $cube.MeasureGroups) {
        $factTable.measureGroups += @{
            name = $mg.Name
            measures = $mg.Measures.Count
        }
    }
    
    # Récupérer les dimensions et leurs relations
    $dimensionTables = @()
    
    foreach ($cubeDim in $cube.Dimensions) {
        $dimensionTables += @{
            name = $cubeDim.Name
            type = if ($cubeDim.Dimension.Type -eq [Microsoft.AnalysisServices.DimensionType]::Time) { "time" } else { "dimension" }
            hierarchies = $cubeDim.Attributes.Count
            relationship = "1:N"  # One-to-Many depuis la dimension vers le fait
        }
    }
    
    $server.Disconnect()
    
    # Diagramme complet
    $diagram = @{
        cubeName = $CubeName
        structure = "star"  # ou "snowflake"
        factTable = $factTable
        dimensionTables = $dimensionTables
    }
    
    Write-Output ($diagram | ConvertTo-Json -Depth 10 -Compress)
    
} catch {
    Write-Error $_.Exception.Message
    Write-Output "{}"
}