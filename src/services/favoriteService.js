import { apiClient, IS_SUPABASE } from '../config/api'
import { normalizeFurniture } from './furnitureService'

const LOCAL_FAV_KEY = 'kayu_ruang_favorites_v1'

export const readLocalFavs = () => {
  try {
    const raw = localStorage.getItem(LOCAL_FAV_KEY)
    return raw ? JSON.parse(raw) : ['furn-101', 'furn-103']
  } catch {
    return []
  }
}

export const writeLocalFavs = (ids) => {
  try {
    localStorage.setItem(LOCAL_FAV_KEY, JSON.stringify(ids))
  } catch {
    /* ignore */
  }
}

class FavoriteService {
  /**
   * Mengambil seluruh produk favorit milik user dari `public.favorites`
   */
  async getFavorites(userIdentifier) {
    if (IS_SUPABASE && navigator.onLine) {
      try {
        const data = await apiClient.get(
          `/rest/v1/favorites?user_id=eq.${userIdentifier}&select=furniture_id,created_at,furnitures(*)`,
        )
        if (Array.isArray(data)) {
          const list = data.map((fav) => {
            const prod = fav.furnitures ? normalizeFurniture(fav.furnitures) : null
            return {
              ...(prod || {}),
              id: fav.furniture_id,
              furniture_id: fav.furniture_id,
              created_at: fav.created_at,
            }
          })
          return { success: true, data: list }
        }
      } catch {
        /* fallback ke localStorage */
      }
    }

    const localIds = readLocalFavs()
    return {
      success: true,
      data: localIds.map((id) => ({ id, furniture_id: id })),
    }
  }

  /**
   * Menambah / menghapus favorit pada `public.favorites`
   */
  async toggleFavorite(data) {
    const rawId = data.furniture_id || data.id
    const userId = data.user_identifier

    if (IS_SUPABASE && navigator.onLine && !String(rawId).startsWith('furn-') && userId) {
      try {
        const targetId = Number(rawId)
        const existing = await apiClient.get(
          `/rest/v1/favorites?furniture_id=eq.${targetId}&user_id=eq.${userId}&select=*`,
        )
        if (Array.isArray(existing) && existing.length > 0) {
          await apiClient.delete(
            `/rest/v1/favorites?furniture_id=eq.${targetId}&user_id=eq.${userId}`,
          )
          return { success: true, data: { is_favorited: false } }
        } else {
          await apiClient.post(
            '/rest/v1/favorites',
            { furniture_id: targetId, user_id: userId },
            { headers: { Prefer: 'return=minimal' } },
          )
          return { success: true, data: { is_favorited: true } }
        }
      } catch {
        /* fallback ke localStorage */
      }
    }

    const targetId = String(rawId)
    const current = readLocalFavs().map(String)
    const idx = current.indexOf(targetId)
    let isFavorited = false

    if (idx === -1) {
      current.push(targetId)
      isFavorited = true
    } else {
      current.splice(idx, 1)
      isFavorited = false
    }
    writeLocalFavs(current)
    return { success: true, data: { is_favorited: isFavorited } }
  }
}

export default new FavoriteService()
