import { isSupabaseConfigured } from '../config/api'
import furnitureService, { readPendingFurnitures } from './furnitureService'
import reviewService, { readPendingReviews } from './reviewService'

let syncInProgress = false
let listenersAttached = false

/**
 * Menghitung jumlah total item katalog & ulasan yang masih menunggu sinkronisasi ke database
 */
export const getPendingOfflineCount = () => {
  const fCount = readPendingFurnitures().length
  const rCount = readPendingReviews().length
  return fCount + rCount
}

/**
 * Menjalankan sinkronisasi berurutan:
 *   1. Sinkronkan item katalog baru yang dibuat saat offline ke `public.furnitures`
 *   2. Sinkronkan ulasan baru yang dibuat saat offline ke `public.reviews`
 *   3. Pancarkan event `supabase-sync-complete` agar halaman langsung memperbarui tampilan
 */
export const syncAllOfflineData = async () => {
  if (!isSupabaseConfigured() || !navigator.onLine || syncInProgress) {
    return { syncedFurnitures: 0, syncedReviews: 0 }
  }

  syncInProgress = true
  window.dispatchEvent(new CustomEvent('supabase-sync-start'))

  try {
    const fRes = await furnitureService.syncPendingFurnitures()
    const rRes = await reviewService.syncPendingReviews()
    const totalSynced = (fRes?.syncedCount || 0) + (rRes?.syncedCount || 0)

    if (totalSynced > 0) {
      window.dispatchEvent(
        new CustomEvent('supabase-sync-complete', {
          detail: {
            syncedFurnitures: fRes?.syncedCount || 0,
            syncedReviews: rRes?.syncedCount || 0,
            totalSynced,
          },
        }),
      )
    }
    return {
      syncedFurnitures: fRes?.syncedCount || 0,
      syncedReviews: rRes?.syncedCount || 0,
      totalSynced,
    }
  } catch (err) {
    console.warn('[SyncService] Sinkronisasi tertunda:', err.message)
    return { syncedFurnitures: 0, syncedReviews: 0, totalSynced: 0 }
  } finally {
    syncInProgress = false
    window.dispatchEvent(new CustomEvent('supabase-sync-end'))
  }
}

/**
 * Mengaktifkan pendengar koneksi (khususnya pada smartphone Android/iOS ketika baru menyalakan Wi-Fi/Data Seluler).
 * Melakukan retry bertahap (0s, 2s, 5s, 9s) karena di HP rute DNS sering membutuhkan 1-3 detik setelah event 'online'.
 */
export const initOfflineSyncListeners = () => {
  if (typeof window === 'undefined' || listenersAttached) return
  listenersAttached = true

  const triggerWithMobileRetries = () => {
    syncAllOfflineData()
    setTimeout(() => syncAllOfflineData(), 2000)
    setTimeout(() => syncAllOfflineData(), 5000)
    setTimeout(() => syncAllOfflineData(), 9000)
  }

  window.addEventListener('online', triggerWithMobileRetries)

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      triggerWithMobileRetries()
    }
  })

  window.addEventListener('focus', () => {
    if (navigator.onLine) {
      syncAllOfflineData()
    }
  })

  // Jika saat aplikasi dibuka dalam keadaan online dan masih ada antrean offline, langsung sinkronkan
  if (navigator.onLine && getPendingOfflineCount() > 0) {
    triggerWithMobileRetries()
  }
}

export default {
  getPendingOfflineCount,
  syncAllOfflineData,
  initOfflineSyncListeners,
}
