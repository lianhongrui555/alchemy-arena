# 游戏项目目录和开发地址。
$projectDir = $PSScriptRoot
$url = 'http://127.0.0.1:5173/alchemy-arena/'

function Test-GameReady {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

# 如果开发服务器已经启动，直接打开页面。
if (-not (Test-GameReady)) {
    $outLog = Join-Path $env:TEMP 'alchemy-arena.out.log'
    $errLog = Join-Path $env:TEMP 'alchemy-arena.err.log'

    # 在隐藏窗口里启动 Vite 开发服务器。
    Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npm run dev -- --host 127.0.0.1 --port 5173' -WorkingDirectory $projectDir -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog | Out-Null

    # 最多等待 45 秒，让 Vite 完成启动。
    $ready = $false
    for ($i = 0; $i -lt 45; $i++) {
        Start-Sleep -Seconds 1
        if (Test-GameReady) {
            $ready = $true
            break
        }
    }

    if (-not $ready) {
        Add-Type -AssemblyName PresentationFramework
        [System.Windows.MessageBox]::Show("游戏启动失败。`n`n错误日志：$errLog", '熔炉对决', 'OK', 'Error') | Out-Null
        exit 1
    }
}

# 打开游戏页面。
Start-Process $url