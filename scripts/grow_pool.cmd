@echo off
rem Wrapper for Task Scheduler: one command, no assumptions about where the
rem task happens to start. Usage: grow_pool.cmd [count] [prefix]
rem The prefix is the Blob pool the new versions join, and it has to match the
rem pool the player is reading or the nightly job grows something nobody sees.
setlocal
cd /d "%~dp0.."
set COUNT=%1
if "%COUNT%"=="" set COUNT=10
set PREFIX=%2
if "%PREFIX%"=="" set PREFIX=journey-multi
".venv\Scripts\python.exe" "scripts\grow_pool.py" --count %COUNT% --prefix %PREFIX% --log "logs\pool.log"
exit /b %ERRORLEVEL%
