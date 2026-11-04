import { apiClient, isSupabaseConfigured } from '../config/api'
import { readSyncedIdMap, readLocalCatalog } from './furnitureService'

const LOCAL_REVIEWS_KEY = 'kayu_ruang_reviews_v1'
const PENDING_REVIEWS_KEY = 'kayu_ruang_pending_reviews_v1'
const SOFT_DELETED_REVIEWS_KEY = 'kayu_ruang_soft_deleted_reviews_v1'
const SOFT_DELETED_REVIEWS_ARCHIVE_KEY = 'kayu_ruang_soft_deleted_reviews_archive_v1'

const STATIC_SEED_REVIEW_IDS = new Set(['rev-1', 'rev-2'])

const DEFAULT_REVIEWS = {
  'furn-101': [
    {
      id: 'rev-1',
      furniture_id: 'furn-101',
      user_identifier: 'Nadya Putri (Arsitek Interior)',
      rating: 5,
      comment: 'Kualitas kayu jatinya sangat padat dan kain bouclé-nya lembut sekali. Pengiriman ke Semarang aman!',
      is_deleted: false,
      deleted_at: null,
      created_at: '2026-10-18T09:30:00.000Z',
    },
  ],
  'furn-102': [
    {
      id: 'rev-2',
      furniture_id: 'furn-102',
      user_identifier: 'Budi Santoso',
      rating: 5,
      comment: 'Meja makan oak-nya kokoh dan serat kayunya tampak sangat natural di ruang makan kami.',
      is_deleted: false,
      deleted_at: null,
      created_at: '2026-10-22T14:15:00.000Z',
    },
  ],
}

export const readPendingReviews = () => {
  try {
    const raw = localStorage.getItem(PENDING_REVIEWS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const writePendingReviews = (list) => {
  try {
    localStorage.setItem(PENDING_REVIEWS_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export const addPendingReview = (reviewObj) => {
  if (!reviewObj) return
  const current = readPendingReviews().filter((r) => String(r.id) !== String(reviewObj.id))
  writePendingReviews([{ ...reviewObj, pending_sync: true }, ...current])
}

export const removePendingReview = (reviewId) => {
  const current = readPendingReviews().filter((r) => String(r.id) !== String(reviewId))
  writePendingReviews(current)
}

const readSoftDeletedReviewIds = () => {
  try {
    const raw = localStorage.getItem(SOFT_DELETED_REVIEWS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

const readDeletedReviewArchive = () => {
  try {
    const raw = localStorage.getItem(SOFT_DELETED_REVIEWS_ARCHIVE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeDeletedReviewArchive = (list) => {
  try {
    localStorage.setItem(SOFT_DELETED_REVIEWS_ARCHIVE_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

const addSoftDeletedReviewRecord = (reviewId, furnitureId, reviewObj = null) => {
  try {
    const current = readSoftDeletedReviewIds()
    if (!current.includes(String(reviewId))) {
      current.push(String(reviewId))
      localStorage.setItem(SOFT_DELETED_REVIEWS_KEY, JSON.stringify(current))
    }
    if (reviewObj) {
      const archive = readDeletedReviewArchive().filter(
        (r) => String(r.id) !== String(reviewId),
      )
      writeDeletedReviewArchive([
        {
          ...reviewObj,
          furniture_id: furnitureId,
          original_comment: String(reviewObj.comment || '').replace(/^\[DELETED\]\s*/, ''),
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        },
        ...archive,
      ])
    }
  } catch {
    /* ignore */
  }
}

const removeSoftDeletedReviewRecord = (reviewId) => {
  try {
    const current = readSoftDeletedReviewIds().filter(
      (id) => String(id) !== String(reviewId),
    )
    localStorage.setItem(SOFT_DELETED_REVIEWS_KEY, JSON.stringify(current))
    const archive = readDeletedReviewArchive().filter(
      (r) => String(r.id) !== String(reviewId),
    )
    writeDeletedReviewArchive(archive)
  } catch {
    /* ignore */
  }
}

const isReviewSoftDeleted = (r, deletedIds = readSoftDeletedReviewIds()) => {
  if (!r) return true
  if (r.is_deleted === true || Boolean(r.deleted_at)) return true
  if (String(r.comment || '').startsWith('[DELETED]')) return true
  if (deletedIds.includes(String(r.id))) return true
  return false
}

const readLocalReviews = () => {
  try {
    const raw = localStorage.getItem(LOCAL_REVIEWS_KEY)
    return raw ? JSON.parse(raw) : DEFAULT_REVIEWS
  } catch {
    return DEFAULT_REVIEWS
  }
}

const writeLocalReviews = (mapObj) => {
  try {
    localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(mapObj))
  } catch {
    /* ignore */
  }
}

let isSyncingReviews = false

class ReviewService {
  /**
   * Helper internal untuk INSERT 1 ulasan ke tabel `public.reviews` di Supabase
   */
  async _insertReviewToSupabase(numericFurnitureId, reviewData) {
    const payload = {
      furniture_id: Number(numericFurnitureId),
      user_id: reviewData.user_id || null,
      user_name:
        reviewData.user_name || reviewData.user_identifier || 'Pelanggan Kayu & Ruang',
      rating: Number(reviewData.rating) || 5,
      comment: reviewData.comment || '',
      is_deleted: false,
      deleted_at: null,
    }
    try {
      const res = await apiClient.post('/rest/v1/reviews', payload, {
        headers: { Prefer: 'return=representation' },
      })
      return Array.isArray(res) ? res[0] : res
    } catch {
      const fallbackPayload = {
        furniture_id: Number(numericFurnitureId),
        user_id: reviewData.user_id || null,
        user_name:
          reviewData.user_name || reviewData.user_identifier || 'Pelanggan Kayu & Ruang',
        rating: Number(reviewData.rating) || 5,
        comment: reviewData.comment || '',
      }
      const res2 = await apiClient.post('/rest/v1/reviews', fallbackPayload, {
        headers: { Prefer: 'return=representation' },
      })
      return Array.isArray(res2) ? res2[0] : res2
    }
  }

  /**
   * Resolusi ID produk: jika ulasan dibuat pada item yang dulunya ber-ID lokal ('furn-...'),
   * cari ID numerik aslinya di peta sinkronisasi atau cari berdasarkan nama produk di Supabase.
   */
  async _resolveNumericFurnitureId(rawFurnitureId, productNameHint = '') {
    const idMap = readSyncedIdMap()
    const mapped = idMap[String(rawFurnitureId)]
    if (mapped && !String(mapped).startsWith('furn-') && !Number.isNaN(Number(mapped))) {
      return Number(mapped)
    }
    if (!String(rawFurnitureId).startsWith('furn-') && !Number.isNaN(Number(rawFurnitureId))) {
      return Number(rawFurnitureId)
    }

    // Cari nama produk dari katalog lokal lalu cocokkan ke Supabase
    const localCatalog = readLocalCatalog()
    const matchLocal = localCatalog.find((f) => String(f.id) === String(rawFurnitureId))
    const targetName = productNameHint || matchLocal?.name || ''
    if (targetName && isSupabaseConfigured() && navigator.onLine) {
      try {
        const rows = await apiClient.get(
          `/rest/v1/furnitures?name=ilike.${encodeURIComponent(targetName)}&select=id&limit=1`,
        )
        if (Array.isArray(rows) && rows.length > 0 && rows[0].id != null) {
          return Number(rows[0].id)
        }
      } catch {
        /* ignore */
      }
    }
    return null
  }

  /**
   * SINKRONISASI ULASAN OFFLINE -> ONLINE:
   * Mengirim semua ulasan yang ditambahkan saat HP offline ke tabel `public.reviews` di Supabase.
   */
  async syncPendingReviews() {
    if (!isSupabaseConfigured() || !navigator.onLine || isSyncingReviews) {
      return { syncedCount: 0 }
    }

    isSyncingReviews = true
    let syncedCount = 0

    try {
      const pendingQueue = readPendingReviews()
      const allLocal = readLocalReviews()

      // Kumpulkan juga ulasan di LOCAL_REVIEWS_KEY yang masih ber-ID 'rev-...' (selain 2 seed statis)
      const mergedMap = new Map()
      pendingQueue.forEach((r) => mergedMap.set(String(r.id), r))

      Object.entries(allLocal).forEach(([fId, list]) => {
        if (Array.isArray(list)) {
          list.forEach((r) => {
            if (
              r &&
              String(r.id).startsWith('rev-') &&
              !STATIC_SEED_REVIEW_IDS.has(String(r.id)) &&
              !r.is_deleted
            ) {
              mergedMap.set(String(r.id), { ...r, furniture_id: r.furniture_id || fId })
            }
          })
        }
      })

      const toSync = Array.from(mergedMap.values())
      if (toSync.length === 0) {
        return { syncedCount: 0 }
      }

      for (const offlineRev of toSync) {
        try {
          const numericId = await this._resolveNumericFurnitureId(
            offlineRev.furniture_id,
            offlineRev.product_name,
          )
          if (numericId !== null) {
            const created = await this._insertReviewToSupabase(numericId, offlineRev)
            if (created && created.id !== undefined) {
              removePendingReview(offlineRev.id)

              // Perbarui di LOCAL_REVIEWS_KEY agar menggunakan ID database asli dan tidak duplikat
              const latestLocal = readLocalReviews()
              const oldKey = String(offlineRev.furniture_id)
              const newKey = String(numericId)

              const formattedCreated = {
                id: created.id,
                furniture_id: numericId,
                user_identifier:
                  created.user_name ||
                  offlineRev.user_identifier ||
                  offlineRev.user_name ||
                  'Pelanggan',
                rating: created.rating || offlineRev.rating || 5,
                comment: created.comment || offlineRev.comment || '',
                pending_sync: false,
                is_deleted: false,
                deleted_at: null,
                created_at: created.created_at || new Date().toISOString(),
              }

              if (Array.isArray(latestLocal[oldKey])) {
                latestLocal[oldKey] = latestLocal[oldKey].filter(
                  (r) => String(r.id) !== String(offlineRev.id),
                )
              }
              const targetArr = Array.isArray(latestLocal[newKey]) ? latestLocal[newKey] : []
              latestLocal[newKey] = [
                formattedCreated,
                ...targetArr.filter((r) => String(r.id) !== String(created.id)),
              ]
              writeLocalReviews(latestLocal)
              syncedCount++
            }
          }
        } catch (err) {
          console.warn('[ReviewService] Gagal sync ulasan offline, akan dicoba lagi:', err.message)
        }
      }
    } finally {
      isSyncingReviews = false
    }

    return { syncedCount }
  }

  /**
   * Mengambil daftar ulasan aktif & soft-deleted untuk 1 produk.
   * Wajib menjalankan syncPendingReviews() terlebih dahulu agar ulasan offline langsung masuk ke Supabase!
   */
  async getReviews(furnitureId) {
    const deletedIds = readSoftDeletedReviewIds()
    const idMap = readSyncedIdMap()
    const resolvedId = idMap[String(furnitureId)] || furnitureId

    const localArchive = readDeletedReviewArchive().filter(
      (r) =>
        String(r.furniture_id) === String(furnitureId) ||
        String(r.furniture_id) === String(resolvedId),
    )

    if (isSupabaseConfigured() && navigator.onLine) {
      try {
        // 1. Sinkronkan ulasan offline terlebih dahulu!
        await this.syncPendingReviews()

        if (!String(resolvedId).startsWith('furn-')) {
          const data = await apiClient.get(
            `/rest/v1/reviews?furniture_id=eq.${resolvedId}&select=*&order=created_at.desc`,
          )
          if (Array.isArray(data)) {
            const formatRow = (r) => ({
              id: r.id,
              furniture_id: r.furniture_id,
              user_identifier:
                r.user_name ||
                (r.user_id ? `Pelanggan ${String(r.user_id).substring(0, 8)}` : 'Pelanggan'),
              rating: r.rating,
              comment: String(r.comment || '').replace(/^\[DELETED\]\s*/, ''),
              original_comment: String(r.comment || '').replace(/^\[DELETED\]\s*/, ''),
              is_deleted: isReviewSoftDeleted(r, deletedIds),
              deleted_at: r.deleted_at || null,
              created_at: r.created_at,
            })

            let activeReviews = data
              .filter((r) => !isReviewSoftDeleted(r, deletedIds))
              .map(formatRow)

            // 2. Jika masih ada ulasan di antrean offline untuk produk ini yang belum sempat terkirim,
            //    gabungkan di bagian atas agar tidak hilang dari tampilan!
            const pendingForProduct = readPendingReviews().filter(
              (p) =>
                (String(p.furniture_id) === String(furnitureId) ||
                  String(p.furniture_id) === String(resolvedId)) &&
                !isReviewSoftDeleted(p, deletedIds),
            )
            if (pendingForProduct.length > 0) {
              const existingComments = new Set(
                activeReviews.map((a) => `${a.user_identifier}:${a.comment}`),
              )
              const unsynced = pendingForProduct.filter(
                (p) => !existingComments.has(`${p.user_identifier}:${p.comment}`),
              )
              activeReviews = [...unsynced, ...activeReviews]
            }

            const remoteDeleted = data
              .filter((r) => isReviewSoftDeleted(r, deletedIds))
              .map(formatRow)

            const delMap = new Map()
            localArchive.forEach((r) => delMap.set(String(r.id), r))
            remoteDeleted.forEach((r) => delMap.set(String(r.id), r))

            return {
              success: true,
              data: activeReviews,
              deletedData: Array.from(delMap.values()),
            }
          }
        }
      } catch {
        /* fallback ke localStorage */
      }
    }

    const allLocal = readLocalReviews()
    const combinedLocal = [
      ...(allLocal[String(resolvedId)] || []),
      ...(String(resolvedId) !== String(furnitureId) ? allLocal[String(furnitureId)] || [] : []),
    ]
    const activeList = combinedLocal.filter((r) => !isReviewSoftDeleted(r, deletedIds))
    const localDeleted = combinedLocal.filter((r) => isReviewSoftDeleted(r, deletedIds))

    const delMap = new Map()
    localArchive.forEach((r) => delMap.set(String(r.id), r))
    localDeleted.forEach((r) => delMap.set(String(r.id), r))

    return {
      success: true,
      data: activeList,
      deletedData: Array.from(delMap.values()),
    }
  }

  /**
   * CREATE ULASAN: Jika online langsung simpan ke Supabase; jika HP sedang offline,
   * simpan ke antrean `kayu_ruang_pending_reviews_v1` agar otomatis di-sync saat kembali online!
   */
  async createReview(furnitureId, reviewData) {
    const numericId = await this._resolveNumericFurnitureId(
      furnitureId,
      reviewData.product_name,
    )

    if (isSupabaseConfigured() && navigator.onLine && numericId !== null) {
      try {
        const created = await this._insertReviewToSupabase(numericId, reviewData)
        if (created) {
          const formatted = {
            id: created.id,
            furniture_id: numericId,
            user_identifier:
              created.user_name ||
              reviewData.user_name ||
              reviewData.user_identifier ||
              'Pelanggan Kayu & Ruang',
            rating: created.rating || Number(reviewData.rating) || 5,
            comment: created.comment || reviewData.comment || '',
            pending_sync: false,
            is_deleted: false,
            deleted_at: null,
            created_at: created.created_at || new Date().toISOString(),
          }
          const allLocal = readLocalReviews()
          const key = String(numericId)
          const existing = allLocal[key] || []
          allLocal[key] = [formatted, ...existing]
          writeLocalReviews(allLocal)
          return { success: true, source: 'supabase', data: formatted }
        }
      } catch (err) {
        console.warn('[ReviewService] Koneksi gagal saat POST ulasan, masuk ke antrean offline:', err.message)
      }
    }

    const newRev = {
      id: `rev-${Date.now()}`,
      furniture_id: String(numericId ?? furnitureId),
      product_name: reviewData.product_name || '',
      user_name:
        reviewData.user_name || reviewData.user_identifier || 'Pelanggan Kayu & Ruang',
      user_identifier:
        reviewData.user_name || reviewData.user_identifier || 'Pelanggan Kayu & Ruang',
      rating: Number(reviewData.rating) || 5,
      comment: reviewData.comment || '',
      pending_sync: true,
      is_deleted: false,
      deleted_at: null,
      created_at: new Date().toISOString(),
    }

    // Masukkan ke antrean sync offline & penyimpanan lokal
    addPendingReview(newRev)
    const allLocal = readLocalReviews()
    const key = String(furnitureId)
    const existing = allLocal[key] || []
    allLocal[key] = [newRev, ...existing]
    writeLocalReviews(allLocal)

    return { success: true, source: 'offline_queue', data: newRev }
  }

  async deleteReview(reviewId, furnitureId, reviewObj = null) {
    const nowIso = new Date().toISOString()
    addSoftDeletedReviewRecord(reviewId, furnitureId, reviewObj)
    removePendingReview(reviewId)

    if (isSupabaseConfigured() && navigator.onLine && !String(reviewId).startsWith('rev-')) {
      try {
        try {
          await apiClient.patch(
            `/rest/v1/reviews?id=eq.${reviewId}`,
            {
              is_deleted: true,
              deleted_at: nowIso,
            },
            { headers: { Prefer: 'return=minimal' } },
          )
        } catch {
          const prevComment = reviewObj?.comment || ''
          await apiClient.patch(
            `/rest/v1/reviews?id=eq.${reviewId}`,
            {
              comment: `[DELETED] ${prevComment}`,
            },
            { headers: { Prefer: 'return=minimal' } },
          )
        }
      } catch (err) {
        console.warn('[ReviewService] Soft delete ulasan lokal diterapkan:', err.message)
      }
    }

    if (furnitureId) {
      const allLocal = readLocalReviews()
      const list = allLocal[String(furnitureId)] || []
      allLocal[String(furnitureId)] = list.map((r) =>
        String(r.id) === String(reviewId)
          ? { ...r, is_deleted: true, deleted_at: nowIso }
          : r,
      )
      writeLocalReviews(allLocal)
    }

    return { success: true, softDeleted: true, deleted_at: nowIso }
  }

  async restoreReview(reviewObj, furnitureId) {
    if (!reviewObj) return { success: false }
    const reviewId = reviewObj.id
    const cleanComment = String(
      reviewObj.original_comment || reviewObj.comment || '',
    ).replace(/^\[DELETED\]\s*/, '')

    removeSoftDeletedReviewRecord(reviewId)

    if (isSupabaseConfigured() && navigator.onLine && !String(reviewId).startsWith('rev-')) {
      try {
        try {
          await apiClient.patch(
            `/rest/v1/reviews?id=eq.${reviewId}`,
            {
              is_deleted: false,
              deleted_at: null,
              comment: cleanComment,
            },
            { headers: { Prefer: 'return=minimal' } },
          )
        } catch {
          await apiClient.patch(
            `/rest/v1/reviews?id=eq.${reviewId}`,
            {
              comment: cleanComment,
            },
            { headers: { Prefer: 'return=minimal' } },
          )
        }
      } catch (err) {
        console.warn('[ReviewService] Restore ulasan lokal diterapkan:', err.message)
      }
    }

    if (furnitureId) {
      const allLocal = readLocalReviews()
      const list = allLocal[String(furnitureId)] || []
      const exists = list.some((r) => String(r.id) === String(reviewId))
      if (exists) {
        allLocal[String(furnitureId)] = list.map((r) =>
          String(r.id) === String(reviewId)
            ? { ...r, comment: cleanComment, is_deleted: false, deleted_at: null }
            : r,
        )
      } else {
        allLocal[String(furnitureId)] = [
          { ...reviewObj, comment: cleanComment, is_deleted: false, deleted_at: null },
          ...list,
        ]
      }
      writeLocalReviews(allLocal)
    }

    return { success: true }
  }

  async hardDeleteReview(reviewId, furnitureId) {
    removeSoftDeletedReviewRecord(reviewId)
    removePendingReview(reviewId)

    if (isSupabaseConfigured() && navigator.onLine && !String(reviewId).startsWith('rev-')) {
      try {
        await apiClient.delete(`/rest/v1/reviews?id=eq.${reviewId}`)
      } catch (err) {
        console.warn('[ReviewService] Gagal hard delete ulasan di Supabase:', err.message)
      }
    }

    if (furnitureId) {
      const allLocal = readLocalReviews()
      const list = allLocal[String(furnitureId)] || []
      allLocal[String(furnitureId)] = list.filter(
        (r) => String(r.id) !== String(reviewId),
      )
      writeLocalReviews(allLocal)
    }

    return { success: true, hardDeleted: true }
  }
}

export default new ReviewService()
