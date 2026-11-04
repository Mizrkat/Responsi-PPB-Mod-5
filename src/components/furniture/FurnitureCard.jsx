import { useState } from 'react'
import { Pencil, Trash2, Share2, ShoppingBag, Check } from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import { formatPrice, truncate, copyProductShareLink } from '../../utils/helpers'
import { useCart } from '../../hooks/useCart'

export default function FurnitureCard({ furniture, onSelect, onEdit, onDelete }) {
  const imgSrc = furniture.image_url || furniture.image || '/furniture/chair.jpg'
  const category = furniture.category || furniture.type || 'Furnitur'
  const material = furniture.material || furniture.caliber || 'Kayu Solid'
  const price = furniture.price ?? 0

  const { addToCart } = useCart()
  const [copiedLink, setCopiedLink] = useState(false)
  const [addedCart, setAddedCart] = useState(false)

  const handleShare = async (e) => {
    e.stopPropagation()
    await copyProductShareLink(furniture)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleAddToCart = (e) => {
    e.stopPropagation()
    addToCart(furniture, 1)
    setAddedCart(true)
    setTimeout(() => setAddedCart(false), 1500)
  }

  return (
    <li className="card">
      <button
        type="button"
        className="card-btn"
        onClick={() => onSelect(furniture)}
        aria-label={`Lihat detail ${furniture.name}`}
      >
        <img
          className="card-img"
          src={imgSrc}
          alt={furniture.name}
          width="280"
          height="200"
          loading="lazy"
        />
        <span className="name display">{furniture.name}</span>
        <span className="type">
          {category} · {material}
        </span>
        {furniture.description && (
          <span className="card-desc">{truncate(furniture.description, 80)}</span>
        )}
        <span className="price">{formatPrice(price)}</span>
      </button>

      {/* Bottom Action Bar: Add to Cart & Share Link */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '0 16px 14px',
        }}
      >
        <button
          type="button"
          className="btn btn--primary btn--sm"
          style={{ flex: 1 }}
          onClick={handleAddToCart}
        >
          {addedCart ? (
            <>
              <Check size={14} /> Masuk Keranjang
            </>
          ) : (
            <>
              <ShoppingBag size={14} /> + Keranjang
            </>
          )}
        </button>

        <button
          type="button"
          className="btn btn--outline btn--sm"
          onClick={handleShare}
          title="Salin link produk untuk dibagikan"
        >
          {copiedLink ? <Check size={14} color="#1e8449" /> : <Share2 size={14} />}
        </button>
      </div>

      {/* Top Right Floating Actions */}
      <div className="card-actions">
        <FavoriteButton furnitureId={furniture.id || furniture.name} />
        {onEdit && (
          <button
            type="button"
            className="card-act-btn"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(furniture)
            }}
            title="Ubah Detail Produk"
          >
            <Pencil size={14} />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className="card-act-btn card-act-btn--danger"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(furniture)
            }}
            title="Hapus Produk"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </li>
  )
}
