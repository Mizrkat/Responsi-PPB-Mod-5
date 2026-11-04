import { useState } from 'react'
import {
  ArrowLeft,
  Star,
  Send,
  Loader,
  Pencil,
  Trash2,
  ShoppingBag,
  Share2,
  Check,
  MessageCircle,
  RotateCcw,
} from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import ConfirmModal from '../modals/ConfirmModal'
import { useReviews, useCreateReview } from '../../hooks/useReviews'
import { useCart } from '../../hooks/useCart'
import { getUserProfile } from '../../services/userService'
import {
  formatPrice,
  averageRating,
  getProductShareUrl,
  copyProductShareLink,
  buildWhatsAppOrderUrl,
} from '../../utils/helpers'

export default function FurnitureDetail({
  furniture,
  onBack,
  onEdit,
  onDelete,
  onNavigateCart,
}) {
  const imgSrc = furniture.image_url || furniture.image || '/furniture/chair.jpg'
  const category = furniture.category || furniture.type || 'Furnitur'
  const material = furniture.material || furniture.caliber || 'Kayu Solid'
  const price = furniture.price ?? 0

  const {
    reviews,
    deletedReviews,
    loading: reviewsLoading,
    refetch: refetchReviews,
    softDeleteReview,
    restoreReview,
    hardDeleteReview,
  } = useReviews(furniture.id)
  const { createReview, loading: submitting } = useCreateReview()
  const { addToCart } = useCart()

  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState('')
  const [showDeletedReviews, setShowDeletedReviews] = useState(false)
  const [reviewToDelete, setReviewToDelete] = useState(null)
  const [reviewToHardDelete, setReviewToHardDelete] = useState(null)
  const [processingReview, setProcessingReview] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [addedMsg, setAddedMsg] = useState('')

  const avgRating = averageRating(reviews)
  const shareUrl = getProductShareUrl(furniture.id || furniture.name)

  const handleShare = async () => {
    await copyProductShareLink(furniture)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const handleAddToCart = () => {
    addToCart(furniture, 1)
    setAddedMsg('Produk berhasil ditambahkan ke keranjang belanja!')
    setTimeout(() => setAddedMsg(''), 3000)
  }

  const handleBuyNow = () => {
    addToCart(furniture, 1)
    if (onNavigateCart) onNavigateCart()
  }

  const handleDirectWhatsApp = () => {
    const waUrl = buildWhatsAppOrderUrl([{ ...furniture, quantity: 1 }])
    window.open(waUrl, '_blank', 'noopener,noreferrer')
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    const profile = getUserProfile()
    await createReview(furniture.id, {
      user_name: profile.username || 'Pelanggan Kayu & Ruang',
      rating,
      comment: comment.trim(),
    })
    setReviewSuccess('Terima kasih! Ulasan Anda telah ditampilkan.')
    setComment('')
    setRating(5)
    refetchReviews()
    setTimeout(() => setReviewSuccess(''), 3000)
  }

  const handleConfirmSoftDeleteReview = async () => {
    if (!reviewToDelete) return
    try {
      setProcessingReview(true)
      await softDeleteReview(reviewToDelete)
      setReviewToDelete(null)
      setReviewSuccess('Ulasan dipindahkan ke tempat sampah (Soft Delete).')
      setTimeout(() => setReviewSuccess(''), 3000)
    } finally {
      setProcessingReview(false)
    }
  }

  const handleRestoreReview = async (rev) => {
    try {
      setProcessingReview(true)
      await restoreReview(rev)
      setReviewSuccess('Ulasan berhasil dikembalikan!')
      setTimeout(() => setReviewSuccess(''), 3000)
    } finally {
      setProcessingReview(false)
    }
  }

  const handleConfirmHardDeleteReview = async () => {
    if (!reviewToHardDelete) return
    try {
      setProcessingReview(true)
      await hardDeleteReview(reviewToHardDelete.id)
      setReviewToHardDelete(null)
      setReviewSuccess('Ulasan telah dihapus secara permanen.')
      setTimeout(() => setReviewSuccess(''), 3000)
    } finally {
      setProcessingReview(false)
    }
  }

  return (
    <div className="detail">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <button type="button" className="detail-back" onClick={onBack}>
          <ArrowLeft size={18} /> Kembali ke Katalog
        </button>

        <button
          type="button"
          className="btn btn--outline btn--sm"
          onClick={handleShare}
          title="Salin link produk untuk dibagikan"
        >
          {copiedLink ? (
            <>
              <Check size={15} color="#1e8449" /> Link Disalin!
            </>
          ) : (
            <>
              <Share2 size={15} /> Bagikan Produk
            </>
          )}
        </button>
      </div>

      {addedMsg && (
        <div className="toast toast--success">
          <Check size={18} /> {addedMsg}
        </div>
      )}

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

          {/* Primary Purchase Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
            <button type="button" className="btn btn--primary" onClick={handleAddToCart}>
              <ShoppingBag size={16} /> + Tambah ke Keranjang
            </button>
            <button type="button" className="btn btn--outline" onClick={handleBuyNow}>
              Beli &amp; Checkout
            </button>
            <button
              type="button"
              className="btn btn--outline"
              style={{ borderColor: '#1e8449', color: '#1e8449' }}
              onClick={handleDirectWhatsApp}
            >
              <MessageCircle size={16} /> Pesan via WhatsApp
            </button>
          </div>

          {/* Secondary Management Actions */}
          <div className="detail-actions">
            <FavoriteButton furnitureId={furniture.id || furniture.name} />
            {onEdit && (
              <button type="button" className="btn btn--outline btn--sm" onClick={() => onEdit(furniture)}>
                <Pencil size={14} /> Ubah Produk
              </button>
            )}
            {onDelete && (
              <button type="button" className="btn btn--danger btn--sm" onClick={() => onDelete(furniture)}>
                <Trash2 size={14} /> Hapus
              </button>
            )}
          </div>

          {/* Authentic Shareable Link Box */}
          <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--paper)', borderRadius: 8, border: '1px solid var(--line)', fontSize: '0.78rem' }}>
            <span style={{ display: 'block', fontWeight: 700, color: 'var(--steel)', marginBottom: 4 }}>
              LINK AUTENTIK PRODUK:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <code style={{ wordBreak: 'break-all', color: 'var(--ink)' }}>{shareUrl}</code>
              <button type="button" className="link-btn" onClick={handleShare} style={{ flexShrink: 0 }}>
                {copiedLink ? 'Tersalin!' : 'Salin Link'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <section className="detail-section">
        <h2>Deskripsi Koleksi</h2>
        <p style={{ lineHeight: 1.6 }}>{furniture.description || 'Tidak ada deskripsi.'}</p>
      </section>

      {furniture.ingredients && furniture.ingredients.length > 0 && (
        <section className="detail-section">
          <h2>Spesifikasi Dimensi &amp; Material</h2>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14, borderBottom: '1px solid var(--line)', paddingBottom: 8 }}>
          <h2 style={{ margin: 0, border: 'none', padding: 0 }}>
            {showDeletedReviews
              ? `Tempat Sampah Ulasan (${deletedReviews.length})`
              : `Ulasan Pelanggan (${reviews.length})`}
          </h2>
          <button
            type="button"
            className={`btn btn--sm ${showDeletedReviews ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => setShowDeletedReviews((prev) => !prev)}
          >
            <Trash2 size={14} />{' '}
            {showDeletedReviews
              ? 'Lihat Ulasan Aktif'
              : `Ulasan Dihapus (${deletedReviews.length})`}
          </button>
        </div>

        {reviewSuccess && (
          <p className="form-success" style={{ marginBottom: 12 }}>
            {reviewSuccess}
          </p>
        )}

        {showDeletedReviews ? (
          deletedReviews.length === 0 ? (
            <p>Belum ada ulasan yang dihapus sementara.</p>
          ) : (
            <ul className="review-list">
              {deletedReviews.map((rev) => (
                <li key={rev.id} className="review-item" style={{ background: 'var(--paper)', padding: 12, borderRadius: 8 }}>
                  <div className="review-head">
                    <span className="review-user">{rev.user_identifier}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={() => handleRestoreReview(rev)}
                        disabled={processingReview}
                      >
                        <RotateCcw size={13} /> Kembalikan
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        onClick={() => setReviewToHardDelete(rev)}
                        disabled={processingReview}
                      >
                        <Trash2 size={13} /> Hapus Permanen
                      </button>
                    </div>
                  </div>
                  <p className="review-comment">{rev.comment}</p>
                </li>
              ))}
            </ul>
          )
        ) : (
          <>
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
                placeholder="Bagikan kesan Anda mengenai kualitas material dan kenyamanan furnitur ini…"
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
            </form>

            {reviewsLoading ? (
              <p>Memuat ulasan…</p>
            ) : reviews.length > 0 ? (
              <ul className="review-list">
                {reviews.map((rev) => (
                  <li key={rev.id} className="review-item">
                    <div className="review-head">
                      <span className="review-user">{rev.user_identifier}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                        <button
                          type="button"
                          className="btn btn--danger-ghost btn--sm"
                          onClick={() => setReviewToDelete(rev)}
                          title="Hapus Ulasan (Soft Delete)"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="review-comment">{rev.comment}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Belum ada ulasan untuk produk ini.</p>
            )}
          </>
        )}
      </section>

      {/* Modal Soft Delete Ulasan */}
      <ConfirmModal
        open={Boolean(reviewToDelete)}
        title="Pindahkan Ulasan ke Tempat Sampah"
        message={`Apakah Anda yakin ingin menghapus sementara ulasan dari "${reviewToDelete?.user_identifier}"? Anda dapat mengembalikannya dari menu Ulasan Dihapus.`}
        confirmLabel="Ya, Soft Delete"
        cancelLabel="Batal"
        danger
        loading={processingReview}
        onConfirm={handleConfirmSoftDeleteReview}
        onCancel={() => setReviewToDelete(null)}
      />

      {/* Modal Hard Delete Ulasan Permanen */}
      <ConfirmModal
        open={Boolean(reviewToHardDelete)}
        title="Hapus Ulasan Permanen (Hard Delete)"
        message={`Apakah Anda yakin ingin menghapus permanen ulasan dari "${reviewToHardDelete?.user_identifier}" dari database? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus Permanen"
        cancelLabel="Batal"
        danger
        loading={processingReview}
        onConfirm={handleConfirmHardDeleteReview}
        onCancel={() => setReviewToHardDelete(null)}
      />
    </div>
  )
}
