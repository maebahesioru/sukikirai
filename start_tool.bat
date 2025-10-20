@echo off
chcp 65001 > nul
echo ========================================
echo   人物追加ツールを起動しています...
echo ========================================
echo.

python add_person_tool.py

if errorlevel 1 (
    echo.
    echo エラーが発生しました。
    echo Pythonがインストールされているか確認してください。
    pause
)
