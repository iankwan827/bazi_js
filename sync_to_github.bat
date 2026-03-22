@echo off
echo Syncing js/ folder to GitHub (bazi_js)...
git add js/ doc/ .gitignore README.md sync_to_github.bat
git commit -m "Update js core and structural changes: %date% %time%"
git push origin main
echo Sync complete!
pause
