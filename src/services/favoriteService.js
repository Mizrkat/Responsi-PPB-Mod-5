import { apiClient, IS_SUPABASE } from '../config/api'
import { normalizeProduct } from './furnitureService'

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
  async getFavorites(userIdentifier) {
    const localIds = readLocalFavs()
    if (IS_SUPABASE && navigator.onLine) {
      try {
        const data = await apiClient.get(
          `/rest/v1/favorites?user_id=eq.${userIdentifier}&select=product_id,created_at,products(*)`,
        )
        if (Array.isArray(data) && data.length > 0) {
          const list = data.map((fav) => {
            const prod = fav.products ? normalizeProduct(fav.products) : null
            return {
              ...(prod || {}),
              id: fav.product_id,
              product_id: fav.product_id,
              created_at: fav.created_at,
            }
          })
          return { success: true, data: list }
        }
      } catch {
        // Fallback ke localStorage
      }
    }
    return {
      success: true,
      data: localIds.map((id) => ({ id, product_id: id })),
    }
  }

  async toggleFavorite(data) {
    const targetId = String(data.recipe_id || data.furniture_id || data.id)
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
