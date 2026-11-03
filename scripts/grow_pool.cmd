@echo off
rem Wrapper for Task Scheduler: one command, no assumptions about where the
rem task happens to start. Usage: grow_pool.cmd [count] [prefix]
rem The prefix is the manifest the new versions are listed in, and it has to
rem be the one the player reads or the nightly job grows something nobody
rem sees. Where the videos themselves go is not an argument: a look owns a
rem prefix of its own and grow_pool derives it from journey\look.json.
setlocal
cd /d "%~dp0.."
set COUNT=%1
if "%COUNT%"=="" set COUNT=10
set PREFIX=%2
if "%PREFIX%"=="" set PREFIX=journey-arc
".venv\Scripts\python.exe" "scripts\grow_pool.py" --count %COUNT% --prefix %PREFIX% --log "logs\pool.log"
exit /b %ERRORLEVEL%
