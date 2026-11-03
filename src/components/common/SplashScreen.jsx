import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowRight, Armchair } from 'lucide-react'

export default function SplashScreen({ onFinish, duration = 2600 }) {
  const [isFading, setIsFading] = useState(false)
  const dismissedRef = useRef(false)

  const handleDismiss = useCallback(() => {
    if (dismissedRef.current) return
    dismissedRef.current = true
    setIsFading(true)
    setTimeout(() => {
      if (onFinish) onFinish()
    }, 450)
  }, [onFinish])

  useEffect(() => {
    const timer = setTimeout(handleDismiss, duration)
    return () => clearTimeout(timer)
  }, [duration, handleDismiss])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'radial-gradient(circle at 50% 40%, #3E2A1E 0%, #1F140E 100%)',
        color: '#F5EBE0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        transition: 'opacity 0.45s ease',
        opacity: isFading ? 0 : 1,
        pointerEvents: isFading ? 'none' : 'auto',
      }}
      onClick={handleDismiss}
    >
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: 24,
          background: '#2C1E16',
          border: '2px solid #D4A373',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
        }}
      >
        <Armchair size={44} color="#D4A373" />
      </div>
      <h1 style={{ fontSize: '2.2rem', margin: '0 0 8px', letterSpacing: '0.04em' }}>
        KAYU &amp; RUANG
      </h1>
      <p style={{ color: '#D4A373', letterSpacing: '0.2em', fontSize: '0.8rem', margin: '0 0 28px' }}>
        ARTISAN FURNITURE NUSANTARA · PWA
      </p>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          handleDismiss()
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 22px',
          borderRadius: 999,
          background: '#D4A373',
          color: '#1F140E',
          border: 'none',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Masuk ke Showroom <ArrowRight size={16} />
      </button>
    </div>
  )
}
