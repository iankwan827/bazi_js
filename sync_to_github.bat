@echo off
echo Syncing to GitHub (bazi_js)...
git add .
git commit -m "Manual sync: %date% %time%"
git push origin main
echo Sync complete!
pause
