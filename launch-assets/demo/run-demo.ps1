<#
.SYNOPSIS
  typeshift v0.2.0 — Live Terminal Demo Script for Windows PowerShell
.DESCRIPTION
  Runs an interactive, beautifully timed terminal demonstration of the published
  @mohsami/typeshift package using committed repository examples.
#>

$ErrorActionPreference = "Continue"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $RepoRoot

function Type-Writer($text, $delayMs = 15) {
  foreach ($char in $text.ToCharArray()) {
    Write-Host -NoNewline $char
    Start-Sleep -Milliseconds $delayMs
  }
  Write-Host ""
}

Clear-Host
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  typeshift v0.2.0 — Schema Compiler Demo" -ForegroundColor Cyan
Write-Host "  Bidirectional, loss-aware conversion between TS, JSON Schema, Zod & OpenAPI" -ForegroundColor DarkGray
Write-Host "======================================================================" -ForegroundColor Cyan
Start-Sleep -Milliseconds 1200

# Step 1: Discover Formats
Write-Host "`n── [Step 1/4] Discover registered schema adapters and capability matrix ──" -ForegroundColor Blue
Start-Sleep -Milliseconds 300
Write-Host -NoNewline "❯ " -ForegroundColor Green
Type-Writer "npx @mohsami/typeshift@0.2.0 list --detailed" 15
Start-Sleep -Milliseconds 400
pnpm dlx @mohsami/typeshift@0.2.0 list --detailed | Where-Object { $_ -notmatch "Progress:|Packages are copied|Done in |dependencies:" }
Start-Sleep -Milliseconds 1500

# Step 2: TS -> JSON Schema
Write-Host "`n── [Step 2/4] Compile TypeScript interface to JSON Schema (Draft-07) ──" -ForegroundColor Blue
Start-Sleep -Milliseconds 300
Write-Host -NoNewline "❯ " -ForegroundColor Green
Type-Writer "npx @mohsami/typeshift@0.2.0 convert examples/01-typescript-to-json-schema/user.ts --to json-schema" 15
Start-Sleep -Milliseconds 400
pnpm dlx @mohsami/typeshift@0.2.0 convert examples/01-typescript-to-json-schema/user.ts --to json-schema | Where-Object { $_ -notmatch "Progress:|Packages are copied|Done in |dependencies:" }
Start-Sleep -Milliseconds 1500

# Step 3: Information-Loss Diagnostics
Write-Host "`n── [Step 3/4] Information-Loss Diagnostics: JSON Schema -> TypeScript ──" -ForegroundColor Blue
Start-Sleep -Milliseconds 300
Write-Host -NoNewline "❯ " -ForegroundColor Green
Type-Writer "npx @mohsami/typeshift@0.2.0 convert examples/03-json-schema-to-typescript/account.json --to typescript" 15
Start-Sleep -Milliseconds 400
pnpm dlx @mohsami/typeshift@0.2.0 convert examples/03-json-schema-to-typescript/account.json --to typescript | Where-Object { $_ -notmatch "Progress:|Packages are copied|Done in |dependencies:" }
Start-Sleep -Milliseconds 1500

# Step 4: Strict loss enforcement in CI (exit code 2)
Write-Host "`n── [Step 4/4] Strict CI Quality Gate: Abort on detected constraint loss ──" -ForegroundColor Blue
Start-Sleep -Milliseconds 300
Write-Host -NoNewline "❯ " -ForegroundColor Green
Type-Writer "npx @mohsami/typeshift@0.2.0 convert examples/05-loss-policy-enforcement/schema-with-constraints.json --to typescript --loss-policy error" 15
Start-Sleep -Milliseconds 400
pnpm dlx @mohsami/typeshift@0.2.0 convert examples/05-loss-policy-enforcement/schema-with-constraints.json --to typescript --loss-policy error | Where-Object { $_ -notmatch "Progress:|Packages are copied|Done in |dependencies:" }
Write-Host "⚡ Process exit code: $LASTEXITCODE" -ForegroundColor Yellow
Start-Sleep -Milliseconds 1500

Write-Host "`n======================================================================" -ForegroundColor Green
Write-Host "  Demo Complete!" -ForegroundColor Green
Write-Host "  GitHub:   https://github.com/mohsami632-dotcom/typeshift"
Write-Host "  npm:      https://www.npmjs.com/package/@mohsami/typeshift"
Write-Host "  Try it:   npx @mohsami/typeshift list --detailed"
Write-Host "======================================================================`n" -ForegroundColor Green
