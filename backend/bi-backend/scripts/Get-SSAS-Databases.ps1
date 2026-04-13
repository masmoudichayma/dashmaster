param(
    [string]$ServerName = "DESKTOP-QBV33CS"
)

try {
    [System.Reflection.Assembly]::LoadWithPartialName("Microsoft.AnalysisServices") | Out-Null
    
    $server = New-Object Microsoft.AnalysisServices.Server
    $server.Connect($ServerName)
    
    # Récupérer les bases de données avec le nombre de cubes
    $databases = @()
    foreach ($db in $server.Databases) {
        $cubeCount = $db.Cubes.Count
        
        $databases += @{
            name = $db.Name
            cubes = @()
            cubeCount = $cubeCount  # Ajouter le nombre de cubes
        }
    }
    
    $server.Disconnect()
    
    # Forcer le retour en tant que tableau
    if ($databases.Count -eq 0) {
        Write-Output "[]"
    } elseif ($databases.Count -eq 1) {
        Write-Output "[$($databases[0] | ConvertTo-Json -Compress)]"
    } else {
        Write-Output ($databases | ConvertTo-Json -Compress)
    }
    
} catch {
    Write-Error $_.Exception.Message
    Write-Output "[]"
}