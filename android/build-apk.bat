@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "KEY_FILE=%SCRIPT_DIR%private\eco-mario-release.p12"
set "PASSWORD_FILE=%SCRIPT_DIR%private\signing-password.txt"
set "BUILD_SCRIPT=%SCRIPT_DIR%build-apk.ps1"

if not exist "%KEY_FILE%" (
  echo ERROR: Signing key not found: "%KEY_FILE%"
  exit /b 1
)

if not exist "%PASSWORD_FILE%" (
  echo ERROR: Signing password file not found: "%PASSWORD_FILE%"
  exit /b 1
)

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo ERROR: Windows PowerShell was not found.
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%BUILD_SCRIPT%"
if errorlevel 1 (
  echo ERROR: APK build or signing failed.
  exit /b 1
)

echo.
echo APK build, signing, and verification completed.
echo Output: "%SCRIPT_DIR%..\downloads\Eco-Mario-1.0.3.apk"
exit /b 0
