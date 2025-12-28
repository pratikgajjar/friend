import { useEffect, useRef } from 'react'

// Turnstile site key
const TURNSTILE_SITE_KEY = '0x4AAAAAACJdYEUXutScMXtl'

declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, options: {
        sitekey: string
        callback: (token: string) => void
        'expired-callback'?: () => void
        'error-callback'?: () => void
        theme?: 'light' | 'dark' | 'auto'
        size?: 'normal' | 'compact'
      }) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

interface TurnstileProps {
  onVerify: (token: string) => void
  onExpire?: () => void
  onError?: () => void
}

// Generate a unique ID for each Turnstile instance
let turnstileIdCounter = 0

export function Turnstile({ onVerify, onExpire, onError }: TurnstileProps) {
  const widgetIdRef = useRef<string | null>(null)
  const containerIdRef = useRef<string>(`turnstile-container-${++turnstileIdCounter}`)
  const mountedRef = useRef(false)
  
  // Store callbacks in refs to prevent re-renders
  const callbacksRef = useRef({ onVerify, onExpire, onError })
  callbacksRef.current = { onVerify, onExpire, onError }

  useEffect(() => {
    // Prevent double-mounting in React Strict Mode
    if (mountedRef.current) return
    mountedRef.current = true

    let checkInterval: ReturnType<typeof setInterval>
    
    const initTurnstile = () => {
      const container = document.getElementById(containerIdRef.current)
      if (!container || !window.turnstile) return false
      
      // Already rendered
      if (widgetIdRef.current) return true
      
      try {
        widgetIdRef.current = window.turnstile.render(container, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => callbacksRef.current.onVerify(token),
          'expired-callback': () => callbacksRef.current.onExpire?.(),
          'error-callback': () => callbacksRef.current.onError?.(),
          theme: 'dark',
          size: 'normal',
        })
        return true
      } catch (e) {
        console.error('Turnstile render error:', e)
        return false
      }
    }

    // Poll until Turnstile is ready
    checkInterval = setInterval(() => {
      if (initTurnstile()) {
        clearInterval(checkInterval)
      }
    }, 100)

    // Cleanup on unmount
    return () => {
      clearInterval(checkInterval)
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch (e) {
          // Ignore errors during cleanup
        }
        widgetIdRef.current = null
      }
      mountedRef.current = false
    }
  }, []) // Empty dependency array - only run once

  return (
    <div 
      id={containerIdRef.current}
      style={{ 
        display: 'flex', 
        justifyContent: 'center',
        margin: '1rem 0',
        minHeight: '65px',
      }} 
    />
  )
}
