import { useEffect, useRef, useCallback, useState } from 'react'

// Turnstile site key
const TURNSTILE_SITE_KEY = '0x4AAAAAACJdYEUXutScMXtl'

declare global {
  interface Window {
    turnstile: {
      render: (container: HTMLElement, options: {
        sitekey: string
        callback: (token: string) => void
        'expired-callback': () => void
        'error-callback': () => void
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

export function Turnstile({ onVerify, onExpire, onError }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const renderedRef = useRef(false)

  // Store callbacks in refs to avoid re-renders
  const onVerifyRef = useRef(onVerify)
  const onExpireRef = useRef(onExpire)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onVerifyRef.current = onVerify
    onExpireRef.current = onExpire
    onErrorRef.current = onError
  }, [onVerify, onExpire, onError])

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || renderedRef.current) return
    
    renderedRef.current = true

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token) => onVerifyRef.current(token),
      'expired-callback': () => onExpireRef.current?.(),
      'error-callback': () => onErrorRef.current?.(),
      theme: 'dark',
      size: 'normal',
    })
  }, [])

  useEffect(() => {
    // Wait for Turnstile script to load
    const checkTurnstile = () => {
      if (window.turnstile) {
        setIsReady(true)
      } else {
        setTimeout(checkTurnstile, 100)
      }
    }
    checkTurnstile()

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch (e) {
          // Widget might already be removed
        }
        widgetIdRef.current = null
        renderedRef.current = false
      }
    }
  }, [])

  useEffect(() => {
    if (isReady) {
      renderWidget()
    }
  }, [isReady, renderWidget])

  return (
    <div 
      ref={containerRef} 
      style={{ 
        display: 'flex', 
        justifyContent: 'center',
        margin: '1rem 0',
        minHeight: '65px', // Reserve space for the widget
      }} 
    />
  )
}
