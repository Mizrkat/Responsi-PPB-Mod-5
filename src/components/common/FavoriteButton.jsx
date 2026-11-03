import { Heart } from 'lucide-react'
import { useIsFavorited } from '../../hooks/useFavorites'

export default function FavoriteButton({ furnitureId, onToggle }) {
  const { isFavorited, loading, toggleFavorite } = useIsFavorited(furnitureId)

  const handleClick = async (e) => {
    e.stopPropagation()
    const result = await toggleFavorite()
    if (result && onToggle) onToggle(result)
  }

  return (
    <button
      type="button"
      className={`fav-btn${isFavorited ? ' fav-btn--active' : ''}`}
      onClick={handleClick}
      disabled={loading}
      aria-label={isFavorited ? 'Hapus dari favorit' : 'Simpan ke favorit'}
      title={isFavorited ? 'Hapus dari favorit' : 'Simpan ke favorit'}
    >
      <Heart
        size={18}
        fill={isFavorited ? '#c0392b' : 'none'}
        stroke={isFavorited ? '#c0392b' : 'var(--ink)'}
      />
    </button>
  )
}
