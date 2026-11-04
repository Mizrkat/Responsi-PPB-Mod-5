import { apiClient, isSupabaseConfigured } from '../config/api'

const LOCAL_REVIEWS_KEY = 'kayu_ruang_reviews_v1'
const SOFT_DELETED_REVIEWS_KEY = 'kayu_ruang_soft_deleted_reviews_v1'

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

const addSoftDeletedReviewId = (reviewId) => {
  try {
    const current = readSoftDeletedReviewIds()
    if (!current.includes(String(reviewId))) {
      current.push(String(reviewId))
      localStorage.setItem(SOFT_DELETED_REVIEWS_KEY, JSON.stringify(current))
    }
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
   * Mengambil daftar ulasan yang aktif (tidak di-soft-delete) untuk 1 produk
   */
  async getReviews(furnitureId) {
    const deletedIds = readSoftDeletedReviewIds()

    if (isSupabaseConfigured() && navigator.onLine && !String(furnitureId).startsWith('furn-')) {
      try {
        const data = await apiClient.get(
          `/rest/v1/reviews?furniture_id=eq.${furnitureId}&select=*&order=created_at.desc`,
        )
        if (Array.isArray(data)) {
          const activeReviews = data
            .filter((r) => !isReviewSoftDeleted(r, deletedIds))
            .map((r) => ({
              id: r.id,
              furniture_id: r.furniture_id,
              user_identifier:
                r.user_name ||
                (r.user_id ? `Pelanggan ${String(r.user_id).substring(0, 8)}` : 'Pelanggan'),
              rating: r.rating,
              comment: r.comment || '',
              is_deleted: Boolean(r.is_deleted),
              deleted_at: r.deleted_at || null,
              created_at: r.created_at,
            }))
          return { success: true, data: activeReviews }
        }
      } catch {
        /* fallback ke localStorage */
      }
    }

    const allLocal = readLocalReviews()
    const list = (allLocal[String(furnitureId)] || []).filter(
      (r) => !isReviewSoftDeleted(r, deletedIds),
    )
    return { success: true, data: list }
  }

  /**
   * Menyimpan ulasan baru ke `public.reviews`
   */
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
   * SOFT DELETE ULASAN: Menandai ulasan sebagai terhapus (is_deleted = true, deleted_at = timestamp)
   * menggunakan PATCH tanpa menghapus baris fisik di tabel `public.reviews`!
   */
  async deleteReview(reviewId, furnitureId) {
    const nowIso = new Date().toISOString()
    addSoftDeletedReviewId(reviewId)

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
          await apiClient.patch(
            `/rest/v1/reviews?id=eq.${reviewId}`,
            {
              comment: '[DELETED]',
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
}

export default new ReviewService()
