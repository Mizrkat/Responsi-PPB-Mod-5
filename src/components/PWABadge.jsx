import { useState, useEffect } from 'react'
import { Download, WifiOff, RefreshCw, CheckCircle, X } from 'lucide-react'
import { initOfflineSyncListeners, syncAllOfflineData } from '../services/syncService'

export default function PWABadge() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncSuccessMsg, setSyncSuccessMsg] = useState('')
  const [installed, setInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    initOfflineSyncListeners()

    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    const handleAppInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
    }
    const handleOnline = () => {
      setIsOffline(false)
      syncAllOfflineData()
    }
    const handleOffline = () => setIsOffline(true)
    const handleSyncStart = () => setIsSyncing(true)
    const handleSyncEnd = () => setIsSyncing(false)
    const handleSyncComplete = (e) => {
      setIsSyncing(false)
      const total = e.detail?.totalSynced || 0
      if (total > 0) {
        setSyncSuccessMsg(`${total} data offline berhasil disinkronkan ke database!`)
        setTimeout(() => setSyncSuccessMsg(''), 4000)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('supabase-sync-start', handleSyncStart)
    window.addEventListener('supabase-sync-end', handleSyncEnd)
    window.addEventListener('supabase-sync-complete', handleSyncComplete)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('supabase-sync-start', handleSyncStart)
      window.removeEventListener('supabase-sync-end', handleSyncEnd)
      window.removeEventListener('supabase-sync-complete', handleSyncComplete)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setInstalled(true)
    }
    setInstallPrompt(null)
  }

  if (isOffline) {
    return (
      <aside className="pwa-badge pwa-badge--offline" role="status" aria-live="polite">
        <WifiOff size={16} />
        <span>
          Mode Offline — Produk &amp; ulasan baru disimpan di perangkat dan otomatis disinkronkan saat internet kembali aktif.
        </span>
      </aside>
    )
  }

  if (isSyncing) {
    return (
      <aside className="pwa-badge" role="status" aria-live="polite">
        <RefreshCw size={16} className="spin" stroke="var(--brass)" />
        <span>Menyinkronkan data offline ke database…</span>
      </aside>
    )
  }

  if (syncSuccessMsg) {
    return (
      <aside className="pwa-badge" role="status" aria-live="polite" style={{ borderColor: '#1e8449' }}>
        <CheckCircle size={16} stroke="#1e8449" />
        <span style={{ color: '#1e8449', fontWeight: 600 }}>{syncSuccessMsg}</span>
      </aside>
    )
  }

  if (dismissed) return null

  if (installPrompt && !installed) {
    return (
      <aside className="pwa-badge" role="region" aria-label="Install App">
        <div className="pwa-badge-content">
          <Download size={16} stroke="var(--brass)" />
          <span>
            Pasang aplikasi <strong>Kayu &amp; Ruang</strong> di perangkat Anda untuk akses offline penuh.
          </span>
        </div>
        <div className="pwa-badge-actions">
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={handleInstallClick}
          >
            Install Aplikasi
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setDismissed(true)}
            aria-label="Tutup banner"
          >
            <X size={14} />
          </button>
        </div>
      </aside>
    )
  }

  return null
}
