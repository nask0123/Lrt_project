@echo off
setlocal
cd /d "%~dp0"
set "lrt_node="
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined lrt_node set "lrt_node=%%N"
if not defined lrt_node if exist "%ProgramFiles%\nodejs\node.exe" set "lrt_node=%ProgramFiles%\nodejs\node.exe"
if not defined lrt_node if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "lrt_node=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not defined lrt_node (
 echo Node.js not found. Install Windows Installer MSI LTS from https://nodejs.org/en/download
 pause
 exit /b 1
)
echo Open http://127.0.0.1:5173 in your browser. Keep this window open.
echo Ctrl+C stops the server.
"%lrt_node%" "%~dp0server.mjs"
pause
