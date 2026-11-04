import { useState, useMemo } from 'react'
import { RefreshCw, Plus, Loader, PackageOpen, RotateCcw } from 'lucide-react'
import { useFurnitures } from '../hooks/useFurnitures'
import FurnitureCard from '../components/furniture/FurnitureCard'
import FurnitureDetail from '../components/furniture/FurnitureDetail'
import AdvancedFilter from '../components/common/AdvancedFilter'
import ConfirmModal from '../components/modals/ConfirmModal'
import furnitureService, { resetLocalCatalog } from '../services/furnitureService'
import {
  matchesSearch,
  matchesCategory,
  sortItems,
  extractCategories,
} from '../utils/helpers'

export default function CatalogPage({ onNavigate }) {
  const { furnitures, loading, source, refetch } = useFurnitures({ limit: 50 })

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Semua')
  const [sortKey, setSortKey] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [selectedFurniture, setSelectedFurniture] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const categories = useMemo(() => extractCategories(furnitures), [furnitures])

  const filteredFurnitures = useMemo(() => {
    const result = furnitures.filter(
      (f) => matchesSearch(f, search) && matchesCategory(f, activeCategory),
    )
    return sortItems(result, sortKey, sortOrder)
  }, [furnitures, search, activeCategory, sortKey, sortOrder])

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await furnitureService.deleteFurniture(deleteTarget.id, deleteTarget.name)
      setDeleteTarget(null)
      refetch()
    } finally {
      setDeleting(false)
    }
  }

  const handleResetDemo = () => {
    resetLocalCatalog()
    refetch()
  }

  if (selectedFurniture) {
    return (
      <FurnitureDetail
        furniture={selectedFurniture}
        onBack={() => setSelectedFurniture(null)}
        onEdit={(f) => onNavigate && onNavigate('Edit', f)}
        onDelete={(f) => {
          setSelectedFurniture(null)
          setDeleteTarget(f)
        }}
      />
    )
  }

  return (
    <>
      <section className="masthead">
        <h1 className="display">Katalog Furniture Kayu Nusantara.</h1>
        <p className="lede">
          Koleksi kursi santai, meja makan solid oak, sofa linen, hingga kabinet credenza
          karya pengrajin Jepara &amp; Semarang. Dilengkapi fitur CRUD penuh yang terhubung ke tabel{' '}
          <code>public.furnitures</code> di Supabase.
        </p>
      </section>

      <section>
        <div className="list-head">
          <div>
            <h2>Koleksi Tersedia ({filteredFurnitures.length} Produk)</h2>
            <span style={{ fontSize: '0.78rem', color: source === 'supabase' ? '#1e8449' : 'var(--steel)' }}>
              Sumber Data: {source === 'supabase' ? 'Database Supabase (public.furnitures)' : 'Penyimpanan Lokal (LocalStorage)'}
            </span>
          </div>
          <div className="list-head-right">
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={refetch}
              title="Muat ulang dari database Supabase"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Segarkan
            </button>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={handleResetDemo}
              title="Kembalikan data katalog awal"
            >
              <RotateCcw size={14} /> Reset Katalog
            </button>
            {onNavigate && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => onNavigate('Create')}
              >
                <Plus size={16} /> Tambah Furniture
              </button>
            )}
          </div>
        </div>

        <AdvancedFilter
          search={search}
          onSearch={setSearch}
          categories={categories}
          activeCategory={activeCategory}
          onCategory={setActiveCategory}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={({ key, order }) => {
            setSortKey(key)
            setSortOrder(order)
          }}
        />

        {loading && (
          <div className="state-box">
            <Loader size={28} className="spin" />
            <p>Memuat katalog furniture dari database…</p>
          </div>
        )}

        {!loading && filteredFurnitures.length === 0 && (
          <div className="state-box">
            <PackageOpen size={28} />
            <p>Tidak ada produk furniture yang cocok dengan pencarian Anda.</p>
          </div>
        )}

        {filteredFurnitures.length > 0 && (
          <ul className="stock">
            {filteredFurnitures.map((item) => (
              <FurnitureCard
                key={item.id || item.name}
                furniture={item}
                onSelect={setSelectedFurniture}
                onEdit={onNavigate ? (f) => onNavigate('Edit', f) : undefined}
                onDelete={setDeleteTarget}
              />
            ))}
          </ul>
        )}
      </section>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Hapus Produk Furniture"
        message={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name}" dari database katalog?`}
        confirmLabel="Hapus Produk"
        cancelLabel="Batal"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
