@echo off
title Citizen Knowledge Control Panel
cd /d "%~dp0"
echo.
echo   Starting Citizen Knowledge Control Panel...
echo   Your browser will open in a moment.
echo.
echo   KEEP THIS WINDOW OPEN while you use the panel.
echo   Close it when you are finished to shut the panel down.
echo.
node control-panel.js
echo.
echo   The panel has stopped. You can close this window.
pause
