import { apiClient, IS_SUPABASE } from '../config/api'

const LOCAL_REVIEWS_KEY = 'kayu_ruang_reviews_v1'

const DEFAULT_REVIEWS = {
  'furn-101': [
    {
      id: 'rev-1',
      furniture_id: 'furn-101',
      user_identifier: 'Nadya Putri (Arsitek Interior)',
      rating: 5,
      comment: 'Kualitas kayu jatinya sangat padat dan kain bouclé-nya lembut sekali. Pengiriman ke Semarang aman!',
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
      created_at: '2026-10-22T14:15:00.000Z',
    },
  ],
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
   * Mengambil daftar ulasan untuk 1 produk dari `public.reviews`
   */
  async getReviews(furnitureId) {
    if (IS_SUPABASE && navigator.onLine && !String(furnitureId).startsWith('furn-')) {
      try {
        const data = await apiClient.get(
          `/rest/v1/reviews?furniture_id=eq.${furnitureId}&select=*&order=created_at.desc`,
        )
        if (Array.isArray(data)) {
          return {
            success: true,
            data: data.map((r) => ({
              id: r.id,
              furniture_id: r.furniture_id,
              user_identifier: r.user_name || (r.user_id ? `Pelanggan ${String(r.user_id).substring(0, 8)}` : 'Anonim'),
              rating: r.rating,
              comment: r.comment || '',
              created_at: r.created_at,
            })),
          }
        }
      } catch {
        /* fallback ke localStorage */
      }
    }

    const allLocal = readLocalReviews()
    return { success: true, data: allLocal[String(furnitureId)] || [] }
  }

  /**
   * Menyimpan ulasan baru ke `public.reviews`
   */
  async createReview(furnitureId, reviewData) {
    if (IS_SUPABASE && navigator.onLine && !String(furnitureId).startsWith('furn-')) {
      try {
        const payload = {
          furniture_id: Number(furnitureId),
          user_id: reviewData.user_id || null,
          user_name: reviewData.user_name || reviewData.user_identifier || 'Pelanggan Kayu & Ruang',
          rating: Number(reviewData.rating) || 5,
          comment: reviewData.comment || '',
        }
        const res = await apiClient.post('/rest/v1/reviews', payload, {
          headers: { Prefer: 'return=representation' },
        })
        const created = Array.isArray(res) ? res[0] : res
        return { success: true, data: created }
      } catch {
        /* fallback ke localStorage */
      }
    }

    const newRev = {
      id: `rev-${Date.now()}`,
      furniture_id: String(furnitureId),
      user_identifier: reviewData.user_name || reviewData.user_identifier || 'Pelanggan Kayu & Ruang',
      rating: Number(reviewData.rating) || 5,
      comment: reviewData.comment || '',
      created_at: new Date().toISOString(),
    }

    const allLocal = readLocalReviews()
    const existing = allLocal[String(furnitureId)] || []
    allLocal[String(furnitureId)] = [newRev, ...existing]
    writeLocalReviews(allLocal)

    return { success: true, data: newRev }
  }
}

export default new ReviewService()
