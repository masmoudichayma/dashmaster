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
    if ($null -eq $database) {
        throw "Database '$DatabaseName' not found"
    }
    
    $cube = $database.Cubes[$CubeName]
    if ($null -eq $cube) {
        throw "Cube '$CubeName' not found in database '$DatabaseName'"
    }
    
    # Récupérer les measures avec DESCRIPTIONS
    $measures = @()
    foreach ($measureGroup in $cube.MeasureGroups) {
        foreach ($measure in $measureGroup.Measures) {
            $measures += @{
                name = $measure.Name
                dataType = $measure.DataType.ToString()
                aggregationType = $measure.AggregateFunction.ToString()
                format = if ($measure.FormatString) { $measure.FormatString } else { "" }
                description = if ($measure.Description) { $measure.Description } else { "Pas de description disponible" }
            }
        }
    }
    
    # Récupérer les dimensions avec DESCRIPTIONS
    $dimensions = @()
    foreach ($cubeDim in $cube.Dimensions) {
        $hierarchies = @()
        
        foreach ($attr in $cubeDim.Attributes) {
            if ($attr.AttributeHierarchyEnabled) {
                $levels = @()
                $levels += @{
                    name = $attr.Attribute.Name
                    columnName = $attr.Attribute.Name
                }
                
                $hierarchies += @{
                    name = $attr.Attribute.Name
                    levels = $levels
                }
            }
        }
        
        $dimensions += @{
            name = $cubeDim.Name
            type = if ($cubeDim.Dimension.Type -eq [Microsoft.AnalysisServices.DimensionType]::Time) { "Time" } else { "Standard" }
            hierarchies = $hierarchies
            attributes = @()
            description = if ($cubeDim.Description) { $cubeDim.Description } else { "Pas de description disponible" }
        }
    }
    
    $server.Disconnect()
    
    # Créer l'objet schéma COMPLET
    $schema = @{
        cubeName = $CubeName
        description = if ($cube.Description) { $cube.Description } else { "Cube OLAP pour l'analyse BI" }
        measures = $measures
        dimensions = $dimensions
        measureGroupCount = $cube.MeasureGroups.Count
        dimensionCount = $cube.Dimensions.Count
    }
    
    Write-Output ($schema | ConvertTo-Json -Depth 10 -Compress)
    
} catch {
    Write-Error $_.Exception.Message
    
    $emptySchema = @{
        cubeName = $CubeName
        description = "Erreur de chargement"
        measures = @()
        dimensions = @()
        measureGroupCount = 0
        dimensionCount = 0
    }
    Write-Output ($emptySchema | ConvertTo-Json -Compress)
}