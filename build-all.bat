@echo off
echo ========================================
echo   🚀 AME Figures - Builder Completo
echo ========================================
echo.

echo 📦 Generando páginas de productos...
node js/generate-pages.js

echo.
echo 🗂️ Generando páginas de categorías...
node js/generate-categories.js

echo.
echo 🗺️ Generando sitemap.xml...
node js/generate-sitemap.js

echo.
echo ========================================
echo   ✅ ¡PROCESO COMPLETADO!
echo ========================================
echo.
echo 📌 Ahora ejecuta:
echo    git add .
echo    git commit -m "Version completa AME Figures con SEO optimizado"
echo    git push
echo.
echo 📌 Verifica en:
echo    https://amefigures.github.io/AME/
echo.
pause