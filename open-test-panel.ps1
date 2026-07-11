# =================================================================
# SEARCHER CONNECTOR — OUVRIR LE TEST PANEL
# =================================================================

Write-Host "🧪 SEARCHER CONNECTOR - Test Panel" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si le serveur tourne
Write-Host "Vérification du serveur..." -NoNewline

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host " ✅ Serveur actif" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ouverture du Test Panel dans le navigateur..." -ForegroundColor Yellow
    Start-Process "http://localhost:3000/test-panel"
    Write-Host ""
    Write-Host "✅ Test Panel ouvert !" -ForegroundColor Green
    Write-Host ""
    Write-Host "📖 Documentation:" -ForegroundColor Cyan
    Write-Host "  - TEST_PANEL_RESUME.md (résumé rapide)" -ForegroundColor Gray
    Write-Host "  - TEST_PANEL_GUIDE.md (guide complet)" -ForegroundColor Gray
} catch {
    Write-Host " ❌ Serveur inactif" -ForegroundColor Red
    Write-Host ""
    Write-Host "Le serveur n'est pas démarré. Lancement automatique..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Exécutez dans un nouveau terminal:" -ForegroundColor Cyan
    Write-Host "  npm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "Puis relancez ce script." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Appuyez sur une touche pour fermer..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
