'use client'

import { useEffect } from 'react'

export default function ScreenshotProtection() {
  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    // Disable text selection
    const handleSelectStart = (e: Event) => {
      e.preventDefault()
      return false
    }

    // Disable drag
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault()
      return false
    }

    // Disable copy
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      return false
    }

    // Disable cut
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault()
      return false
    }

    // Disable common screenshot shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable Print Screen
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault()
        e.stopPropagation()
        alert('⚠️ Screenshots are not allowed on this page for security reasons.')
        return false
      }
      
      // Disable F12 (DevTools)
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      
      // Disable Ctrl+Shift+I (DevTools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.keyCode === 73)) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      
      // Disable Ctrl+Shift+J (Console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.keyCode === 74)) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      
      // Disable Ctrl+Shift+C (Inspect Element)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.keyCode === 67)) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      
      // Disable Ctrl+U (View Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U' || e.keyCode === 85)) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      
      // Disable Ctrl+S (Save Page)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.keyCode === 83)) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      
      // Disable Ctrl+P (Print)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P' || e.keyCode === 80)) {
        e.preventDefault()
        e.stopPropagation()
        alert('⚠️ Printing is not allowed on this page for security reasons.')
        return false
      }
      
      // Disable Ctrl+Shift+P (Command Palette in DevTools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'P' || e.keyCode === 80)) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }

      // Disable Ctrl+A (Select All)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A' || e.keyCode === 65)) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
    }

    // Detect DevTools opening
    let devtools = {
      open: false,
      orientation: null as 'vertical' | 'horizontal' | null
    }
    
    const detectDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160
      const heightThreshold = window.outerHeight - window.innerHeight > 160
      
      if (widthThreshold || heightThreshold) {
        if (!devtools.open) {
          devtools.open = true
          alert('⚠️ Developer tools are not allowed on this page. Please close them to continue.')
          // Optionally redirect or disable functionality
        }
      } else {
        devtools.open = false
      }
    }

    // Monitor for DevTools
    const devToolsInterval = setInterval(detectDevTools, 500)

    // Detect screen recording (limited detection)
    const detectScreenRecording = () => {
      // Check if page is being recorded by monitoring performance
      const startTime = performance.now()
      requestAnimationFrame(() => {
        const endTime = performance.now()
        const frameTime = endTime - startTime
        
        // If frame time is unusually high, might indicate screen recording
        if (frameTime > 100) {
          console.warn('Possible screen recording detected')
        }
      })
    }

    // Monitor for screen recording
    const screenRecordingInterval = setInterval(detectScreenRecording, 1000)

    // Disable common screenshot methods
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden - might be taking screenshot
        console.warn('⚠️ Page visibility changed - screenshot may have been taken')
      }
    }

    // Detect window blur (might indicate screenshot tool)
    const handleBlur = () => {
      console.warn('⚠️ Window lost focus - possible screenshot attempt')
    }

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu, { capture: true })
    document.addEventListener('selectstart', handleSelectStart, { capture: true })
    document.addEventListener('dragstart', handleDragStart, { capture: true })
    document.addEventListener('copy', handleCopy, { capture: true })
    document.addEventListener('cut', handleCut, { capture: true })
    document.addEventListener('keydown', handleKeyDown, { capture: true })
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)

    // Add CSS to disable text selection
    const style = document.createElement('style')
    style.id = 'screenshot-protection-style'
    style.textContent = `
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      
      input, textarea, [contenteditable="true"] {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
    `
    document.head.appendChild(style)

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true })
      document.removeEventListener('selectstart', handleSelectStart, { capture: true })
      document.removeEventListener('dragstart', handleDragStart, { capture: true })
      document.removeEventListener('copy', handleCopy, { capture: true })
      document.removeEventListener('cut', handleCut, { capture: true })
      document.removeEventListener('keydown', handleKeyDown, { capture: true })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      clearInterval(devToolsInterval)
      clearInterval(screenRecordingInterval)
      const styleElement = document.getElementById('screenshot-protection-style')
      if (styleElement) {
        document.head.removeChild(styleElement)
      }
    }
  }, [])

  return null
}

