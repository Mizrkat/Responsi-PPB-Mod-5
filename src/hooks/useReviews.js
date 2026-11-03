import { useState, useEffect, useCallback } from 'react'
import reviewService from '../services/reviewService'

export function useReviews(furnitureId) {
  const [reviews, setReviews] = useState([])
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
      }
    } finally {
      setLoading(false)
    }
  }, [furnitureId])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  return { reviews, loading, refetch: fetchReviews }
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
