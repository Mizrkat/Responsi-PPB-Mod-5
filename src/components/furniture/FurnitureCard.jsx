import { Pencil, Trash2 } from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import { formatPrice, truncate } from '../../utils/helpers'

export default function FurnitureCard({ furniture, onSelect, onEdit, onDelete }) {
  const imgSrc = furniture.image_url || furniture.image || '/furniture/chair.jpg'
  const category = furniture.type || furniture.category || 'Furniture'
  const material = furniture.caliber || 'Kayu Solid'
  const price = furniture.price ?? furniture.cook_time ?? 0

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
            title="Edit Produk"
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
