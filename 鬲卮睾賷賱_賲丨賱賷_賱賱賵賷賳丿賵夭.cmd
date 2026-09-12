@echo off
title Hakim Optics - Offline
cd /d "%~dp0"
echo.
echo ==========================================
echo   Hakim Optics - Offline Local Server
echo ==========================================
echo.
echo افتح المتصفح على: http://127.0.0.1:8765
echo لاغلاق النظام اضغط Ctrl+C
echo.

where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server 8765 --bind 127.0.0.1
  goto :end
)

where python >nul 2>nul
if %errorlevel%==0 (
  python -m http.server 8765 --bind 127.0.0.1
  goto :end
)

echo لم يتم العثور على Python.
echo استخدم النسخة المنشورة مرة واحدة للتفعيل ثم ثبتها كتطبيق PWA.
pause
:end
