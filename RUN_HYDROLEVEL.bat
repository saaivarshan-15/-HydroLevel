@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title HydroLevel FINAL - One Click Run
color 0B

echo ==========================================
echo          HYDROLEVEL FINAL
echo       ONE-CLICK LOCAL LAUNCHER
echo ==========================================
echo.

if not exist "backend\app.py" (
  echo ERROR: backend\app.py was not found.
  echo Make sure you are in the folder containing backend, frontend and requirements.txt.
  pause
  exit /b 1
)

REM Python 3.14 can spend a long time building a fresh venv with ensurepip.
REM HydroLevel does not need a virtual environment to run locally, so this
REM launcher uses the installed Python and installs dependencies for the user.
set "PY=py"
%PY% --version >nul 2>&1
if errorlevel 1 set "PY=python"

%PY% --version
if errorlevel 1 (
  echo ERROR: Python was not found on PATH.
  echo Install Python 3.12+ and make sure the Python launcher is enabled.
  pause
  exit /b 1
)

echo.
echo Checking HydroLevel dependencies...
%PY% -c "import flask,pandas,openpyxl,xlrd,reportlab,matplotlib" >nul 2>&1
if errorlevel 1 (
  echo Installing required packages for your Windows user account...
  echo Please let pip finish. This is the only setup step.
  %PY% -m pip install --user -r requirements.txt
  if errorlevel 1 (
    echo.
    echo ERROR: Dependency installation failed.
    echo Run: %PY% -m pip --version
    pause
    exit /b 1
  )
) else (
  echo Dependencies are already installed.
)

echo.
echo Starting HydroLevel...
echo Browser: http://127.0.0.1:5050
start "" "http://127.0.0.1:5050"
echo.
%PY% backend\app.py

if errorlevel 1 (
  echo.
  echo HydroLevel stopped with an error.
  pause
)
endlocal
