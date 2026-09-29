@echo off
title RepoIntel Unified Server
echo Starting RepoIntel unified server...
powershell -ExecutionPolicy Bypass -File "%~dp0deploy.ps1"
pause
