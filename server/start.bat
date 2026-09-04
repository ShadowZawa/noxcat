@echo off
setlocal
cd /d "%~dp0"

set "PYTHON_EXE=g:\skywing\.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
	echo Python virtual environment was not found:
	echo %PYTHON_EXE%
	pause
	exit /b 1
)

echo Starting NOXCAT API at https://twswapi.cloudns.nz:3022
"%PYTHON_EXE%" main.py

pause
