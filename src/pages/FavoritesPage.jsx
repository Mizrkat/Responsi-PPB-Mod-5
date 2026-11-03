import { useMemo } from 'react'
import { Heart, ArrowRight } from 'lucide-react'
import { useFavorites } from '../hooks/useFavorites'
import { useFurnitures } from '../hooks/useFurnitures'
import FurnitureCard from '../components/furniture/FurnitureCard'
import { formatPrice } from '../utils/helpers'

export default function FavoritesPage({ onSelectFurniture, onNavigateCatalog }) {
  const { favorites } = useFavorites()
  const { furnitures } = useFurnitures({ limit: 100 })

  const favoriteItems = useMemo(() => {
    const favIds = new Set(
      favorites.map((f) => String(typeof f === 'object' ? f.id ?? f.product_id : f)),
    )
    return furnitures.filter((item) => favIds.has(String(item.id)))
  }, [favorites, furnitures])

  const totalEstimate = useMemo(
    () => favoriteItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0),
    [favoriteItems],
  )

  return (
    <div className="fav-page">
      <section className="masthead">
        <h1 className="display">Daftar Keinginan &amp; Favorit</h1>
        <p className="lede">
          Produk furniture pilihan yang Anda tandai untuk inspirasi penataan ruang. Tersimpan otomatis secara offline di perangkat Anda.
        </p>
      </section>

      <section className="fav-content">
        <div className="list-head">
          <h2>Koleksi Tersimpan ({favoriteItems.length} Item)</h2>
          {favoriteItems.length > 0 && (
            <span className="count">
              Total Estimasi Anggaran: <strong>{formatPrice(totalEstimate)}</strong>
            </span>
          )}
        </div>

        {favoriteItems.length === 0 ? (
          <div className="state-box">
            <Heart size={36} stroke="var(--steel)" />
            <h3>Belum ada furniture favorit</h3>
            <p className="lede">
              Jelajahi katalog dan klik ikon hati pada furniture yang Anda sukai untuk menyimpannya di halaman ini.
            </p>
            {onNavigateCatalog && (
              <button
                type="button"
                className="btn btn--primary"
                onClick={onNavigateCatalog}
                style={{ marginTop: 12 }}
              >
                Jelajahi Katalog <ArrowRight size={16} />
              </button>
            )}
          </div>
        ) : (
          <ul className="stock">
            {favoriteItems.map((item) => (
              <FurnitureCard
                key={item.id}
                furniture={item}
                onSelect={onSelectFurniture}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
