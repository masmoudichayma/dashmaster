param(
    [string]$ServerName = "DESKTOP-QBV33CS",
    [string]$DatabaseName
)

try {
    [System.Reflection.Assembly]::LoadWithPartialName("Microsoft.AnalysisServices") | Out-Null
    
    $server = New-Object Microsoft.AnalysisServices.Server
    $server.Connect($ServerName)
    
    $database = $server.Databases[$DatabaseName]
    
    if ($null -eq $database) {
        throw "Database '$DatabaseName' not found"
    }
    
    # Récupérer les cubes
    $cubes = @()
    foreach ($cube in $database.Cubes) {
        $cubes += @{
            name = $cube.Name
            description = if ($cube.Description) { $cube.Description } else { "" }
        }
    }
    
    $server.Disconnect()
    
    # IMPORTANT: Forcer le retour en tant que tableau
    if ($cubes.Count -eq 0) {
        Write-Output "[]"
    } elseif ($cubes.Count -eq 1) {
        # Forcer format tableau pour un seul élément
        Write-Output "[$($cubes[0] | ConvertTo-Json -Compress)]"
    } else {
        Write-Output ($cubes | ConvertTo-Json -Compress)
    }
    
} catch {
    Write-Error $_.Exception.Message
    Write-Output "[]"
}