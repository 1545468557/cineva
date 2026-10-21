#!/usr/bin/env pwsh
# XiaoYunQue (Cineva) — Vercel 部署脚本
# 用法：在 frontend 目录下执行  .\deploy.ps1
# 预览部署：.\deploy.ps1 -Preview
# 生产部署：.\deploy.ps1

param(
    [switch]$Preview,
    [string]$BackendUrl = ""
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$CLI = 'C:\Users\joker king\AppData\Roaming\npm\vercel.cmd'

Write-Host ''
Write-Host '=== XiaoYunQue / Vercel deploy ===' -ForegroundColor Cyan
Write-Host ''

# 1. 登录检查
& $CLI whoami *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host '[1/4] 未登录，启动 vercel login（会打开浏览器）...' -ForegroundColor Yellow
    & $CLI login
    if ($LASTEXITCODE -ne 0) { throw '登录失败' }
} else {
    Write-Host "[1/4] 已登录：$(& $CLI whoami 2>$null)" -ForegroundColor Green
}

# 2. 环境变量
Write-Host '[2/4] 检查环境变量...' -ForegroundColor Cyan
if ($BackendUrl) {
    & $CLI env add BACKEND_API_URL $BackendUrl
    & $CLI env add NEXT_PUBLIC_API_URL $BackendUrl
    Write-Host "      BACKEND_API_URL / NEXT_PUBLIC_API_URL -> $BackendUrl" -ForegroundColor Green
} else {
    $cur = & $CLI env ls 2>$null
    if ($cur -match 'BACKEND_API_URL') {
        Write-Host '      BACKEND_API_URL 已设置' -ForegroundColor Green
    } else {
        Write-Host '      ! BACKEND_API_URL 未设置 —— 线上 API 会全部失败' -ForegroundColor Red
        Write-Host '        后端部署好后执行：vercel env add BACKEND_API_URL <你的后端地址>' -ForegroundColor Red
    }
}

# 3. 构建验证
Write-Host '[3/4] 本地构建验证...' -ForegroundColor Cyan
& cmd /c 'node_modules\.bin\next build'
if ($LASTEXITCODE -ne 0) { throw '构建失败，终止部署' }
Write-Host '      构建通过' -ForegroundColor Green

# 4. 部署
if ($Preview) {
    Write-Host '[4/4] 预览部署...' -ForegroundColor Cyan
    & $CLI deploy
} else {
    Write-Host '[4/4] 生产部署...' -ForegroundColor Cyan
    & $CLI deploy --prod
}

Write-Host ''
Write-Host '=== done ===' -ForegroundColor Cyan
