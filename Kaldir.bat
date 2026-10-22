@echo off
rem Summa OPOS Regmark - Windows uninstaller
rem Removes the Summa-*.js scripts from CorelDRAW's user Scripts folder.
setlocal
title Summa OPOS Regmark - Kaldirma
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

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\install-windows.ps1" -Uninstall %*
set "RC=%ERRORLEVEL%"

echo.
pause
exit /b %RC%
