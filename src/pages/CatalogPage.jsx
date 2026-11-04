import { useState, useMemo, useEffect } from 'react'
import { RefreshCw, Plus, Loader, PackageOpen } from 'lucide-react'
import { useFurnitures } from '../hooks/useFurnitures'
import FurnitureCard from '../components/furniture/FurnitureCard'
import FurnitureDetail from '../components/furniture/FurnitureDetail'
import AdvancedFilter from '../components/common/AdvancedFilter'
import ConfirmModal from '../components/modals/ConfirmModal'
import furnitureService from '../services/furnitureService'
import {
  matchesSearch,
  matchesCategory,
  sortItems,
  extractCategories,
} from '../utils/helpers'

export default function CatalogPage({ onNavigate }) {
  const { furnitures, loading, refetch } = useFurnitures({ limit: 50 })

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Semua')
  const [sortKey, setSortKey] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [selectedFurniture, setSelectedFurniture] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Buka otomatis detail produk jika URL memiliki parameter ?produk=<id>
  useEffect(() => {
    if (furnitures.length === 0) return
    const params = new URLSearchParams(window.location.search)
    const sharedId = params.get('produk') || params.get('item')
    if (sharedId && !selectedFurniture) {
      const match = furnitures.find(
        (f) =>
          String(f.id) === String(sharedId) ||
          (f.name && f.name.toLowerCase() === sharedId.toLowerCase()),
      )
      if (match) {
        setSelectedFurniture(match)
      }
    }
  }, [furnitures, selectedFurniture])

  const handleSelectProduct = (item) => {
    setSelectedFurniture(item)
    if (item && item.id) {
      const nextUrl = `${window.location.pathname}?produk=${encodeURIComponent(item.id)}`
      window.history.replaceState(null, '', nextUrl)
    }
  }

  const handleCloseDetail = () => {
    setSelectedFurniture(null)
    window.history.replaceState(null, '', window.location.pathname)
  }

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

  if (selectedFurniture) {
    return (
      <FurnitureDetail
        furniture={selectedFurniture}
        onBack={handleCloseDetail}
        onEdit={(f) => onNavigate && onNavigate('Edit', f)}
        onDelete={(f) => {
          handleCloseDetail()
          setDeleteTarget(f)
        }}
        onNavigateCart={() => onNavigate && onNavigate('Cart')}
      />
    )
  }

  return (
    <>
      <section className="masthead">
        <h1 className="display">Sentuhan Hangat Kayu Alami untuk Setiap Sudut Ruang.</h1>
        <p className="lede">
          Temukan koleksi kursi santai jati pilihan, meja makan solid oak, sofa minimalis, hingga kabinet penyimpanan yang dirancang untuk kenyamanan hunian modern Anda.
        </p>
      </section>

      <section>
        <div className="list-head">
          <h2>Koleksi Pilihan ({filteredFurnitures.length} Produk)</h2>
          <div className="list-head-right">
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={refetch}
              title="Perbarui tampilan katalog"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Segarkan
            </button>
            {onNavigate && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => onNavigate('Create')}
              >
                <Plus size={16} /> Tambah Koleksi
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
            <p>Menyiapkan koleksi furnitur pilihan…</p>
          </div>
        )}

        {!loading && filteredFurnitures.length === 0 && (
          <div className="state-box">
            <PackageOpen size={28} />
            <p>Belum ada koleksi furnitur yang sesuai dengan pencarian Anda.</p>
          </div>
        )}

        {filteredFurnitures.length > 0 && (
          <ul className="stock">
            {filteredFurnitures.map((item) => (
              <FurnitureCard
                key={item.id || item.name}
                furniture={item}
                onSelect={handleSelectProduct}
                onEdit={onNavigate ? (f) => onNavigate('Edit', f) : undefined}
                onDelete={setDeleteTarget}
              />
            ))}
          </ul>
        )}
      </section>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Hapus Koleksi Furnitur"
        message={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name}" dari katalog?`}
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
