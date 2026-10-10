@echo off
title GenOS: TopoSafe-RAG Dashboard Launcher
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_dashboard.ps1"
pause
