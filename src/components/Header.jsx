import { Plus, Armchair, ShoppingBag } from 'lucide-react'
import { useFavorites } from '../hooks/useFavorites'
import { useCart } from '../hooks/useCart'

const NAV_ITEMS = [
  { id: 'Catalog', label: 'Katalog' },
  { id: 'Favorites', label: 'Favorit', badgeType: 'fav' },
  { id: 'Cart', label: 'Keranjang', badgeType: 'cart' },
  { id: 'Profile', label: 'Profil' },
]

export default function Header({ tab, onTab, onNavigateCreate }) {
  const { favorites } = useFavorites()
  const { totalCount: cartCount } = useCart()
  const favCount = favorites ? favorites.length : 0

  return (
    <header className="header">
      <div
        className="header-brand-wrap"
        onClick={() => onTab('Catalog')}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
      >
        <div className="header-logo-badge">
          <Armchair size={20} color="#F5EBE0" />
        </div>
        <div>
          <span className="brand display">Kayu &amp; Ruang</span>
          <span
            style={{
              display: 'block',
              fontSize: '0.68rem',
              color: 'var(--steel)',
              letterSpacing: '0.08em',
            }}
          >
            KOLEKSI FURNITUR NUSANTARA
          </span>
        </div>
      </div>

      <nav className="nav">
        {NAV_ITEMS.map((item) => {
          const badgeVal =
            item.badgeType === 'fav'
              ? favCount
              : item.badgeType === 'cart'
              ? cartCount
              : 0
          return (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? 'nav-link active' : 'nav-link'}
              onClick={() => onTab(item.id)}
            >
              {item.id === 'Cart' && <ShoppingBag size={15} />}
              {item.label}
              {badgeVal > 0 && <span className="nav-badge">{badgeVal}</span>}
            </button>
          )
        })}
      </nav>

      {onNavigateCreate && (
        <button
          type="button"
          className="btn btn--primary btn--sm header-cta"
          onClick={onNavigateCreate}
          title="Tambah koleksi furnitur baru"
        >
          <Plus size={15} /> Tambah Koleksi
        </button>
      )}
    </header>
  )
}
