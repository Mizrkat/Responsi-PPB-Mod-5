import { apiClient, isSupabaseConfigured } from '../config/api'

const LOCAL_REVIEWS_KEY = 'kayu_ruang_reviews_v1'
const SOFT_DELETED_REVIEWS_KEY = 'kayu_ruang_soft_deleted_reviews_v1'
const SOFT_DELETED_REVIEWS_ARCHIVE_KEY = 'kayu_ruang_soft_deleted_reviews_archive_v1'

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

class ReviewService {
  /**
   * Mengambil daftar ulasan aktif & daftar ulasan yang di-soft-delete untuk 1 produk
   */
  async getReviews(furnitureId) {
    const deletedIds = readSoftDeletedReviewIds()
    const localArchive = readDeletedReviewArchive().filter(
      (r) => String(r.furniture_id) === String(furnitureId),
    )

    if (isSupabaseConfigured() && navigator.onLine && !String(furnitureId).startsWith('furn-')) {
      try {
        const data = await apiClient.get(
          `/rest/v1/reviews?furniture_id=eq.${furnitureId}&select=*&order=created_at.desc`,
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

          const activeReviews = data
            .filter((r) => !isReviewSoftDeleted(r, deletedIds))
            .map(formatRow)

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
      } catch {
        /* fallback ke localStorage */
      }
    }

    const allLocal = readLocalReviews()
    const allForProduct = allLocal[String(furnitureId)] || []
    const activeList = allForProduct.filter((r) => !isReviewSoftDeleted(r, deletedIds))
    const localDeleted = allForProduct.filter((r) => isReviewSoftDeleted(r, deletedIds))

    const delMap = new Map()
    localArchive.forEach((r) => delMap.set(String(r.id), r))
    localDeleted.forEach((r) => delMap.set(String(r.id), r))

    return {
      success: true,
      data: activeList,
      deletedData: Array.from(delMap.values()),
    }
  }

  async createReview(furnitureId, reviewData) {
    if (isSupabaseConfigured() && navigator.onLine && !String(furnitureId).startsWith('furn-')) {
      try {
        const payload = {
          furniture_id: Number(furnitureId),
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
          const created = Array.isArray(res) ? res[0] : res
          return { success: true, data: created }
        } catch {
          const fallbackPayload = {
            furniture_id: Number(furnitureId),
            user_id: reviewData.user_id || null,
            user_name:
              reviewData.user_name || reviewData.user_identifier || 'Pelanggan Kayu & Ruang',
            rating: Number(reviewData.rating) || 5,
            comment: reviewData.comment || '',
          }
          const res2 = await apiClient.post('/rest/v1/reviews', fallbackPayload, {
            headers: { Prefer: 'return=representation' },
          })
          const created2 = Array.isArray(res2) ? res2[0] : res2
          return { success: true, data: created2 }
        }
      } catch {
        /* fallback ke localStorage */
      }
    }

    const newRev = {
      id: `rev-${Date.now()}`,
      furniture_id: String(furnitureId),
      user_identifier:
        reviewData.user_name || reviewData.user_identifier || 'Pelanggan Kayu & Ruang',
      rating: Number(reviewData.rating) || 5,
      comment: reviewData.comment || '',
      is_deleted: false,
      deleted_at: null,
      created_at: new Date().toISOString(),
    }

    const allLocal = readLocalReviews()
    const existing = allLocal[String(furnitureId)] || []
    allLocal[String(furnitureId)] = [newRev, ...existing]
    writeLocalReviews(allLocal)

    return { success: true, data: newRev }
  }

  /**
   * SOFT DELETE ULASAN
   */
  async deleteReview(reviewId, furnitureId, reviewObj = null) {
    const nowIso = new Date().toISOString()
    addSoftDeletedReviewRecord(reviewId, furnitureId, reviewObj)

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

  /**
   * RESTORE ULASAN (Kembalikan ulasan yang sudah di-soft delete)
   */
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

  /**
   * HARD DELETE ULASAN (Hapus Permanen dari Database `public.reviews`)
   */
  async hardDeleteReview(reviewId, furnitureId) {
    removeSoftDeletedReviewRecord(reviewId)

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
