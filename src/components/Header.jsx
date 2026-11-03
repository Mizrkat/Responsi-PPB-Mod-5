import { Plus, Armchair } from 'lucide-react'
import { useFavorites } from '../hooks/useFavorites'

const NAV_ITEMS = [
  { id: 'Catalog', label: 'Katalog & CRUD' },
  { id: 'Favorites', label: 'Favorit', hasBadge: true },
  { id: 'Showroom', label: 'Showroom' },
  { id: 'Profile', label: 'Profil Praktikan' },
]

export default function Header({ tab, onTab, onNavigateCreate }) {
  const { favorites } = useFavorites()
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
          <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--steel)', letterSpacing: '0.08em' }}>
            ARTISAN FURNITURE PWA
          </span>
        </div>
      </div>

      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'nav-link active' : 'nav-link'}
            onClick={() => onTab(item.id)}
          >
            {item.label}
            {item.hasBadge && favCount > 0 && (
              <span className="nav-badge">{favCount}</span>
            )}
          </button>
        ))}
      </nav>

      {onNavigateCreate && (
        <button
          type="button"
          className="btn btn--primary btn--sm header-cta"
          onClick={onNavigateCreate}
          title="Tambah produk furniture baru"
        >
          <Plus size={15} /> Tambah Produk
        </button>
      )}
    </header>
  )
}
