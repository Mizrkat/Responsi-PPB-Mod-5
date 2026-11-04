import { useState, useEffect, useCallback } from 'react'
import reviewService from '../services/reviewService'

export function useReviews(furnitureId) {
  const [reviews, setReviews] = useState([])
  const [deletedReviews, setDeletedReviews] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchReviews = useCallback(async () => {
    if (!furnitureId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const res = await reviewService.getReviews(furnitureId)
      if (res.success) {
        setReviews(res.data || [])
        setDeletedReviews(res.deletedData || [])
      }
    } finally {
      setLoading(false)
    }
  }, [furnitureId])

  useEffect(() => {
    fetchReviews()

    const handleSyncOrOnline = () => {
      fetchReviews()
    }
    window.addEventListener('supabase-sync-complete', handleSyncOrOnline)
    window.addEventListener('online', handleSyncOrOnline)
    return () => {
      window.removeEventListener('supabase-sync-complete', handleSyncOrOnline)
      window.removeEventListener('online', handleSyncOrOnline)
    }
  }, [fetchReviews])

  const softDeleteReview = useCallback(
    async (reviewObj) => {
      await reviewService.deleteReview(reviewObj.id, furnitureId, reviewObj)
      await fetchReviews()
    },
    [furnitureId, fetchReviews],
  )

  const restoreReview = useCallback(
    async (reviewObj) => {
      await reviewService.restoreReview(reviewObj, furnitureId)
      await fetchReviews()
    },
    [furnitureId, fetchReviews],
  )

  const hardDeleteReview = useCallback(
    async (reviewId) => {
      await reviewService.hardDeleteReview(reviewId, furnitureId)
      await fetchReviews()
    },
    [furnitureId, fetchReviews],
  )

  return {
    reviews,
    deletedReviews,
    loading,
    refetch: fetchReviews,
    softDeleteReview,
    restoreReview,
    hardDeleteReview,
  }
}

export function useCreateReview() {
  const [loading, setLoading] = useState(false)

  const createReview = async (furnitureId, reviewData) => {
    try {
      setLoading(true)
      const res = await reviewService.createReview(furnitureId, reviewData)
      return res.data
    } finally {
      setLoading(false)
    }
  }

  return { createReview, loading }
}
