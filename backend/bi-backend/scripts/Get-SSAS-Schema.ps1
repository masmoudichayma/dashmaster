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
    
    # Récupérer les measures
    $measures = @()
    foreach ($measureGroup in $cube.MeasureGroups) {
        foreach ($measure in $measureGroup.Measures) {
            $measures += @{
                name = $measure.Name
                dataType = $measure.DataType.ToString()
                aggregationType = $measure.AggregateFunction.ToString()
                format = if ($measure.FormatString) { $measure.FormatString } else { "" }
            }
        }
    }
    
    # Récupérer les dimensions
    $dimensions = @()
    foreach ($cubeDim in $cube.Dimensions) {
        $hierarchies = @()
        
        # Parcourir les hiérarchies
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
        }
    }
    
    $server.Disconnect()
    
    # Créer l'objet schéma
    $schema = @{
        cubeName = $CubeName
        measures = $measures
        dimensions = $dimensions
    }
    
    # Retourner en JSON avec profondeur suffisante
    Write-Output ($schema | ConvertTo-Json -Depth 10 -Compress)
    
} catch {
    Write-Error $_.Exception.Message
    
    # Retourner schéma vide en cas d'erreur
    $emptySchema = @{
        cubeName = $CubeName
        measures = @()
        dimensions = @()
    }
    Write-Output ($emptySchema | ConvertTo-Json -Compress)
}