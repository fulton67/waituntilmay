@echo off
rem Wrapper for Task Scheduler and for the development server's "publish
rem look" button: one command, no assumptions about where the task happens
rem to start.
rem
rem   relayer.cmd                 look for a job on Blob and run it; exits
rem                               quietly when nothing is queued, which is
rem                               what makes it safe to run on a timer
rem   relayer.cmd --job local     run journey\look.json as it stands
rem
rem Everything else is passed through to scripts\relayer.mjs. The Blob token
rem is read from .env.local by node itself and is never put on a command
rem line.
setlocal
cd /d "%~dp0.."
if not exist "logs" mkdir "logs"
set JOBARGS=%*
if "%JOBARGS%"=="" set JOBARGS=--job blob
if exist ".env.local" (
  node --env-file=.env.local "scripts\relayer.mjs" %JOBARGS% >> "logs\relayer.log" 2>&1
) else (
  node "scripts\relayer.mjs" %JOBARGS% >> "logs\relayer.log" 2>&1
)
exit /b %ERRORLEVEL%
