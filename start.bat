@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title 供采管家 (Personal Workship) - 本地服务

echo ========================================================
echo          供采管家 (Personal Workship) 快速启动
echo ========================================================
echo.

:: 1. 检查 Node.js 环境
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js ^(建议 v20+^)。
    echo.
    pause
    exit /b 1
)

:: 2. 检查并初始化 .env 配置文件
if not exist ".env" (
    echo [提示] 未检测到 .env 文件，正在生成默认本地开发配置...
    (
        echo DATABASE_URL="file:./dev.db"
        echo ALLOW_DEV_SESSION_SECRET="true"
    ) > ".env"
)

:: 3. 检查依赖是否已安装
if not exist "node_modules" (
    echo [1/3] 首次运行，正在安装项目依赖 ^(npm install^)...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败，请检查网络或 npm 配置。
        pause
        exit /b 1
    )
) else (
    echo [1/3] 依赖检查通过。
)

:: 4. 检查本地 SQLite 数据库
if not exist "prisma\dev.db" (
    echo [2/3] 未检测到本地数据库 prisma\dev.db，正在初始化数据库结构与种子数据...
    call npx prisma generate
    call npx prisma migrate deploy
    call npm run prisma:seed
    if %errorlevel% neq 0 (
        echo [错误] 数据库初始化失败。
        pause
        exit /b 1
    )
) else (
    echo [2/3] 本地数据库检查通过 ^(prisma\dev.db^)。
)

:: 5. 延迟自动打开浏览器并启动服务
echo [3/3] 正在启动本地服务：http://localhost:3000
echo       ^(关闭此窗口即可停止服务^)
echo ========================================================
echo.

start "" /b cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"
call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [错误] 服务异常退出，请查看上方报错信息。
    pause
    exit /b 1
)

endlocal
