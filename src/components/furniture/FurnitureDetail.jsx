import { useState } from 'react'
import { ArrowLeft, Star, Send, Loader, Pencil, Trash2 } from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import { useReviews, useCreateReview } from '../../hooks/useReviews'
import { getUserProfile } from '../../services/userService'
import { formatPrice, averageRating } from '../../utils/helpers'

export default function FurnitureDetail({ furniture, onBack, onEdit, onDelete }) {
  const imgSrc = furniture.image_url || furniture.image || '/furniture/chair.jpg'
  const category = furniture.type || furniture.category || 'Furniture'
  const material = furniture.caliber || 'Kayu Solid'
  const price = furniture.price ?? furniture.cook_time ?? 0

  const { reviews, loading: reviewsLoading, refetch: refetchReviews } = useReviews(furniture.id)
  const { createReview, loading: submitting } = useCreateReview()

  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState('')

  const avgRating = averageRating(reviews)

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    const profile = getUserProfile()
    await createReview(furniture.id, {
      user_name: `${profile.username} (${profile.kelompok})`,
      rating,
      comment: comment.trim(),
    })
    setReviewSuccess('Ulasan berhasil ditambahkan!')
    setComment('')
    setRating(5)
    refetchReviews()
    setTimeout(() => setReviewSuccess(''), 3000)
  }

  return (
    <div className="detail">
      <button type="button" className="detail-back" onClick={onBack}>
        <ArrowLeft size={18} /> Kembali ke Katalog
      </button>

      <div className="detail-hero">
        <img className="detail-img" src={imgSrc} alt={furniture.name} />
        <div className="detail-info">
          <span className="pill pill--active" style={{ alignSelf: 'flex-start' }}>
            {category}
          </span>
          <h1 className="display">{furniture.name}</h1>
          <p className="type">{material}</p>
          <p className="price detail-price">{formatPrice(price)}</p>

          {avgRating > 0 && (
            <p className="detail-rating">
              <Star size={16} fill="var(--brass)" stroke="var(--brass)" />
              {avgRating.toFixed(1)} ({reviews.length} ulasan pembeli)
            </p>
          )}

          <div className="detail-actions">
            <FavoriteButton furnitureId={furniture.id || furniture.name} />
            {onEdit && (
              <button type="button" className="btn btn--outline" onClick={() => onEdit(furniture)}>
                <Pencil size={15} /> Edit Produk
              </button>
            )}
            {onDelete && (
              <button type="button" className="btn btn--danger" onClick={() => onDelete(furniture)}>
                <Trash2 size={15} /> Hapus
              </button>
            )}
          </div>
        </div>
      </div>

      <section className="detail-section">
        <h2>Deskripsi Produk</h2>
        <p style={{ lineHeight: 1.6 }}>{furniture.description || 'Tidak ada deskripsi.'}</p>
      </section>

      {furniture.ingredients && furniture.ingredients.length > 0 && (
        <section className="detail-section">
          <h2>Spesifikasi &amp; Material</h2>
          <ul className="detail-specs">
            {furniture.ingredients.map((ing, i) => (
              <li key={ing.id || i}>
                <strong>{ing.name}:</strong> {ing.quantity}
              </li>
            ))}
          </ul>
        </section>
      )}

      {furniture.steps && furniture.steps.length > 0 && (
        <section className="detail-section">
          <h2>Panduan Perakitan &amp; Perawatan</h2>
          <ol className="detail-steps">
            {furniture.steps.map((step, i) => (
              <li key={i}>{step.instruction || step}</li>
            ))}
          </ol>
        </section>
      )}

      <section className="detail-section">
        <h2>Ulasan Pelanggan</h2>
        <form className="review-form" onSubmit={handleSubmitReview}>
          <div className="review-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="star-btn"
                onClick={() => setRating(n)}
              >
                <Star
                  size={22}
                  fill={n <= rating ? 'var(--brass)' : 'none'}
                  stroke={n <= rating ? 'var(--brass)' : 'var(--steel)'}
                />
              </button>
            ))}
          </div>
          <textarea
            className="review-input"
            rows="3"
            placeholder="Tulis ulasan mengenai kualitas kayu, kenyamanan, atau estetika produk ini…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
          />
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? (
              <>
                <Loader size={16} className="spin" /> Mengirim…
              </>
            ) : (
              <>
                <Send size={16} /> Kirim Ulasan
              </>
            )}
          </button>
          {reviewSuccess && <p className="form-success">{reviewSuccess}</p>}
        </form>

        {reviewsLoading ? (
          <p>Memuat ulasan…</p>
        ) : reviews.length > 0 ? (
          <ul className="review-list">
            {reviews.map((rev) => (
              <li key={rev.id} className="review-item">
                <div className="review-head">
                  <span className="review-user">{rev.user_identifier}</span>
                  <span className="review-stars-display">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        size={14}
                        fill={i < rev.rating ? 'var(--brass)' : 'none'}
                        stroke={i < rev.rating ? 'var(--brass)' : 'var(--line)'}
                      />
                    ))}
                  </span>
                </div>
                <p className="review-comment">{rev.comment}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>Belum ada ulasan untuk produk ini.</p>
        )}
      </section>
    </div>
  )
}
