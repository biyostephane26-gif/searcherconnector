# =================================================================
# SEARCHER CONNECTOR — SCRIPT DE TEST SANTÉ APPLICATION
# Test automatique des pages principales et APIs
# =================================================================

Write-Host "🧪 SEARCHER CONNECTOR - Test de santé application" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3001"
$results = @()

# Liste des pages à tester
$pages = @(
    @{ Path = "/"; Name = "Page d'accueil" },
    @{ Path = "/login"; Name = "Page de connexion" },
    @{ Path = "/dashboard"; Name = "Dashboard" },
    @{ Path = "/profile"; Name = "Profil" },
    @{ Path = "/opportunities"; Name = "Opportunités" },
    @{ Path = "/pricing"; Name = "Tarifs" },
    @{ Path = "/about"; Name = "À propos" }
)

Write-Host "📊 Test des pages principales..." -ForegroundColor Yellow
Write-Host ""

foreach ($page in $pages) {
    $url = "$baseUrl$($page.Path)"
    Write-Host "  Testing: $($page.Name) ($url)" -NoNewline
    
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 60 -ErrorAction Stop
        
        if ($response.StatusCode -eq 200) {
            Write-Host " ✅ OK" -ForegroundColor Green
            $results += @{
                Page = $page.Name
                Status = "✅ OK"
                Code = $response.StatusCode
            }
        } else {
            Write-Host " ⚠️  $($response.StatusCode)" -ForegroundColor Yellow
            $results += @{
                Page = $page.Name
                Status = "⚠️ Warning"
                Code = $response.StatusCode
            }
        }
        
        # Pause pour éviter surcharge
        Start-Sleep -Milliseconds 500
        
    } catch {
        Write-Host " ❌ ERREUR" -ForegroundColor Red
        $results += @{
            Page = $page.Name
            Status = "❌ Erreur"
            Code = "Error"
        }
    }
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "📈 RÉSUMÉ DES TESTS" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

$success = ($results | Where-Object { $_.Status -eq "✅ OK" }).Count
$total = $results.Count

foreach ($result in $results) {
    $color = if ($result.Status -eq "✅ OK") { "Green" } elseif ($result.Status -eq "⚠️ Warning") { "Yellow" } else { "Red" }
    Write-Host "  $($result.Page): $($result.Status) (HTTP $($result.Code))" -ForegroundColor $color
}

Write-Host ""
Write-Host "Succès: $success/$total pages" -ForegroundColor $(if ($success -eq $total) { "Green" } else { "Yellow" })
Write-Host ""

if ($success -eq $total) {
    Write-Host "🎉 Tous les tests sont passés avec succès!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠️  Certains tests ont échoué. Vérifiez les logs ci-dessus." -ForegroundColor Yellow
    exit 1
}
