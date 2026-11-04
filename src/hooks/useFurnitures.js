import { useState, useEffect, useCallback } from 'react'
import furnitureService from '../services/furnitureService'

export function useFurnitures(params = {}) {
  const [furnitures, setFurnitures] = useState([])
  const [deletedFurnitures, setDeletedFurnitures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [source, setSource] = useState('local')

  const paramKey = JSON.stringify(params)

  const fetchFurnitures = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await furnitureService.getFurnitures(params)
      if (response.success) {
        setFurnitures(response.data || [])
        setDeletedFurnitures(response.deletedData || [])
        setSource(response.source || 'local')
      } else {
        setError(response.message || 'Gagal memuat katalog furnitur.')
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat memuat katalog.')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramKey])

  useEffect(() => {
    fetchFurnitures()
  }, [fetchFurnitures])

  return {
    furnitures,
    deletedFurnitures,
    loading,
    error,
    source,
    refetch: fetchFurnitures,
  }
}
