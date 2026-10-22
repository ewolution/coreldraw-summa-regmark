@echo off
rem Summa OPOS Regmark - Windows installer
rem Copies the JavaScript scripts into CorelDRAW's user Scripts folder.
setlocal
title Summa OPOS Regmark - Kurulum
chcp 65001 >nul
cd /d "%~dp0"

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo.
  echo HATA: PowerShell bulunamadi.
  echo Windows PowerShell 5.1 veya uzeri gerekli.
  echo.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\install-windows.ps1" %*
set "RC=%ERRORLEVEL%"

echo.
pause
exit /b %RC%
