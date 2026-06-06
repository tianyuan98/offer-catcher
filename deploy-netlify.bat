@echo off
echo ============================================
echo   Offer捕手 一键部署到 Netlify
echo ============================================
echo.
echo [Step 1] 安装 Netlify CLI...
call npm install -g netlify-cli
echo.
echo [Step 2] 登录 Netlify（会打开浏览器）...
call netlify login
echo.
echo [Step 3] 部署...
call netlify deploy --prod --dir=out
echo.
echo ============================================
echo   部署完成！
echo ============================================
pause
