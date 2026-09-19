#!/usr/bin/env pwsh
# =============================================================================
# release.ps1 — Script de publication d'une nouvelle version
# =============================================================================
# Usage :
#   .\release.ps1           → bump du patch (1.0.3 → 1.0.4)
#   .\release.ps1 -Minor    → bump du minor (1.0.3 → 1.1.0)
#   .\release.ps1 -Major    → bump du major (1.0.3 → 2.0.0)
#   .\release.ps1 -Version 1.2.0  → version exacte
#
# Ce script :
#   1. Bump la version dans package.json
#   2. Crée un commit "chore: release vX.X.X"
#   3. Crée le tag git vX.X.X
#   4. Push le commit + le tag → GitHub Actions build automatiquement
# =============================================================================

param(
    [switch]$Minor,
    [switch]$Major,
    [string]$Version
)

# --- Lire la version actuelle ---
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$currentVersion = $packageJson.version
Write-Host "Version actuelle : $currentVersion" -ForegroundColor Cyan

# --- Calculer la nouvelle version ---
if ($Version) {
    $newVersion = $Version
}
else {
    $parts = $currentVersion -split '\.'
    $major = [int]$parts[0]
    $minor = [int]$parts[1]
    $patch = [int]$parts[2]

    if ($Major) {
        $major++; $minor = 0; $patch = 0
    }
    elseif ($Minor) {
        $minor++; $patch = 0
    }
    else {
        $patch++  # Par défaut : patch bump
    }

    $newVersion = "$major.$minor.$patch"
}

Write-Host "Nouvelle version : $newVersion" -ForegroundColor Green

# --- Confirmation ---
$confirm = Read-Host "Publier la version v$newVersion ? (o/N)"
if ($confirm -ne 'o' -and $confirm -ne 'O') {
    Write-Host "Annulé." -ForegroundColor Yellow
    exit 0
}

# --- Mettre à jour package.json ---
$packageJson.version = $newVersion
$packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json" -Encoding UTF8
Write-Host "✅ package.json mis à jour" -ForegroundColor Green

# --- Git commit + tag ---
git add package.json
git commit -m "chore: release v$newVersion"
git tag -a "v$newVersion" -m "Version $newVersion"

# --- Push ---
Write-Host "📤 Push vers GitHub..." -ForegroundColor Cyan
git push origin main
git push origin "v$newVersion"

Write-Host ""
Write-Host "🚀 Release v$newVersion lancée !" -ForegroundColor Green
Write-Host "   GitHub Actions va maintenant builder l'installateur automatiquement."
Write-Host "   Suivi : https://github.com/FredGml/outil-de-gestion-financiere/actions"
