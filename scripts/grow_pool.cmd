@echo off
rem Wrapper for Task Scheduler: one command, no assumptions about where the
rem task happens to start. Usage: grow_pool.cmd [count]
setlocal
cd /d "%~dp0.."
set COUNT=%1
if "%COUNT%"=="" set COUNT=10
".venv\Scripts\python.exe" "scripts\grow_pool.py" --count %COUNT% --log "logs\pool.log"
exit /b %ERRORLEVEL%
