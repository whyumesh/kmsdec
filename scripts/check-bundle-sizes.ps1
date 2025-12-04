# Bundle Size Checker Script (PowerShell)
# This script checks the size of various directories to identify what's taking up space

Write-Host "📊 Bundle Size Analysis" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""

# Check .next directory
if (Test-Path ".next") {
    Write-Host "📁 .next directory:" -ForegroundColor Blue
    $nextSize = (Get-ChildItem .next -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
    Write-Host "   Total: $([math]::Round($nextSize / 1MB, 2)) MB ($($nextSize) bytes)" -ForegroundColor Green
    Write-Host ""
    
    # Check .next/server
    if (Test-Path ".next\server") {
        Write-Host "📁 .next/server:" -ForegroundColor Blue
        $serverSize = (Get-ChildItem .next\server -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
        Write-Host "   Size: $([math]::Round($serverSize / 1MB, 2)) MB ($($serverSize) bytes)" -ForegroundColor Green
        
        # Check for large files
        Write-Host "   Largest files:" -ForegroundColor Yellow
        Get-ChildItem .next\server -Recurse -File -ErrorAction SilentlyContinue | 
            Sort-Object Length -Descending | 
            Select-Object -First 10 | 
            ForEach-Object {
                $sizeMB = [math]::Round($_.Length / 1MB, 2)
                Write-Host "     $sizeMB MB - $($_.FullName.Replace((Get-Location).Path + '\', ''))"
            }
        Write-Host ""
    }
    
    # Check .next/standalone
    if (Test-Path ".next\standalone") {
        Write-Host "📁 .next/standalone:" -ForegroundColor Blue
        $standaloneSize = (Get-ChildItem .next\standalone -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
        Write-Host "   Size: $([math]::Round($standaloneSize / 1MB, 2)) MB" -ForegroundColor Green
        Write-Host ""
    }
    
    # Check .next/static
    if (Test-Path ".next\static") {
        Write-Host "📁 .next/static:" -ForegroundColor Blue
        $staticSize = (Get-ChildItem .next\static -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
        Write-Host "   Size: $([math]::Round($staticSize / 1MB, 2)) MB" -ForegroundColor Green
        Write-Host ""
    }
    
    # Check .next/cache
    if (Test-Path ".next\cache") {
        Write-Host "⚠️  .next/cache exists (should be removed):" -ForegroundColor Yellow
        $cacheSize = (Get-ChildItem .next\cache -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
        Write-Host "   Size: $([math]::Round($cacheSize / 1MB, 2)) MB" -ForegroundColor Yellow
        Write-Host ""
    }
    
    # Count .map files
    $mapFiles = Get-ChildItem .next -Recurse -Filter "*.map" -ErrorAction SilentlyContinue
    if ($mapFiles.Count -gt 0) {
        $mapSize = ($mapFiles | Measure-Object Length -Sum).Sum
        Write-Host "⚠️  Found $($mapFiles.Count) .map files in .next (total: $([math]::Round($mapSize / 1MB, 2)) MB)" -ForegroundColor Yellow
        Write-Host ""
    }
} else {
    Write-Host "❌ .next directory not found. Run 'npm run build' first." -ForegroundColor Red
    Write-Host ""
}

# Check node_modules
if (Test-Path "node_modules") {
    Write-Host "📁 node_modules:" -ForegroundColor Blue
    $nodeModulesSize = (Get-ChildItem node_modules -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
    Write-Host "   Total: $([math]::Round($nodeModulesSize / 1MB, 2)) MB" -ForegroundColor Green
    Write-Host ""
    
    # Check Prisma
    if (Test-Path "node_modules\.prisma") {
        Write-Host "📁 node_modules/.prisma:" -ForegroundColor Blue
        $prismaSize = (Get-ChildItem node_modules\.prisma -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
        Write-Host "   Size: $([math]::Round($prismaSize / 1MB, 2)) MB" -ForegroundColor Green
        
        # Check Prisma binary
        $binaryPath = "node_modules\.prisma\client\libquery_engine-rhel-openssl-3.0.x.so.node"
        if (Test-Path $binaryPath) {
            $binarySize = (Get-Item $binaryPath).Length
            Write-Host "   RHEL Binary: $([math]::Round($binarySize / 1MB, 2)) MB" -ForegroundColor Green
        }
        Write-Host ""
    }
    
    # Check largest packages
    Write-Host "📦 Largest packages in node_modules:" -ForegroundColor Blue
    Get-ChildItem node_modules -Directory -ErrorAction SilentlyContinue | 
        ForEach-Object {
            $size = (Get-ChildItem $_.FullName -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
            [PSCustomObject]@{
                Name = $_.Name
                Size = $size
            }
        } | 
        Sort-Object Size -Descending | 
        Select-Object -First 15 | 
        ForEach-Object {
            $sizeMB = [math]::Round($_.Size / 1MB, 2)
            Write-Host "   $sizeMB MB - $($_.Name)"
        }
    Write-Host ""
}

# Estimate Netlify function size
if ((Test-Path ".next\server") -and (Test-Path "node_modules\.prisma\client\libquery_engine-rhel-openssl-3.0.x.so.node")) {
    Write-Host "📊 Estimated Netlify Function Size:" -ForegroundColor Blue
    $serverSizeBytes = (Get-ChildItem .next\server -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
    $binarySizeBytes = (Get-Item "node_modules\.prisma\client\libquery_engine-rhel-openssl-3.0.x.so.node").Length
    
    $totalBytes = $serverSizeBytes + $binarySizeBytes
    $totalMB = [math]::Round($totalBytes / 1MB, 2)
    
    Write-Host "   .next/server: $serverSizeBytes bytes (~$([math]::Round($serverSizeBytes / 1MB, 2)) MB)"
    Write-Host "   Prisma binary: $binarySizeBytes bytes (~$([math]::Round($binarySizeBytes / 1MB, 2)) MB)"
    Write-Host "   Total: $totalBytes bytes (~$totalMB MB)"
    
    if ($totalMB -gt 250) {
        $excess = [math]::Round($totalMB - 250, 2)
        Write-Host "   ❌ EXCEEDS 250 MB LIMIT by ~$excess MB" -ForegroundColor Red
    } else {
        Write-Host "   ✅ Within 250 MB limit ($totalMB MB / 250 MB)" -ForegroundColor Green
    }
    Write-Host ""
}

Write-Host "======================" -ForegroundColor Cyan
Write-Host "✅ Analysis complete!" -ForegroundColor Green

