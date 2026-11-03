import { useState, useEffect, useCallback } from 'react'
import favoriteService, { readLocalFavs } from '../services/favoriteService'
import { getUserIdentifier } from '../services/userService'

export function useFavorites() {
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const userIdentifier = getUserIdentifier()

  const fetchFavorites = useCallback(async () => {
    try {
      setLoading(true)
      const response = await favoriteService.getFavorites(userIdentifier)
      if (response.success) {
        setFavorites(response.data || [])
      }
    } catch {
      setFavorites(readLocalFavs().map((id) => ({ id })))
    } finally {
      setLoading(false)
    }
  }, [userIdentifier])

  useEffect(() => {
    fetchFavorites()
    const handleStorage = () => fetchFavorites()
    window.addEventListener('favorites-updated', handleStorage)
    return () => window.removeEventListener('favorites-updated', handleStorage)
  }, [fetchFavorites])

  return { favorites, loading, refetch: fetchFavorites }
}

export function useIsFavorited(furnitureId) {
  const { favorites, loading, refetch } = useFavorites()

  const isFavorited = favorites.some((fav) => {
    const favId = typeof fav === 'object' && fav !== null ? fav.id ?? fav.product_id : fav
    return String(favId) === String(furnitureId)
  })

  const toggleFavorite = async () => {
    const res = await favoriteService.toggleFavorite({ id: furnitureId })
    await refetch()
    window.dispatchEvent(new CustomEvent('favorites-updated'))
    return res.data
  }

  return { isFavorited, loading, toggleFavorite }
}
