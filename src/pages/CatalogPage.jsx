import { useState, useMemo, useEffect } from 'react'
import {
  RefreshCw,
  Plus,
  Loader,
  PackageOpen,
  Trash2,
  RotateCcw,
  ArchiveRestore,
} from 'lucide-react'
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
  formatPrice,
} from '../utils/helpers'

export default function CatalogPage({ onNavigate }) {
  const { furnitures, deletedFurnitures, loading, refetch } = useFurnitures({ limit: 50 })

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Semua')
  const [sortKey, setSortKey] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [selectedFurniture, setSelectedFurniture] = useState(null)

  // Mode tampilan: 'active' (Katalog Utama) atau 'trash' (Item yang di-Soft Delete)
  const [showTrash, setShowTrash] = useState(false)

  // Modal state untuk Soft Delete & Hard Delete
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [hardDeleteTarget, setHardDeleteTarget] = useState(null)
  const [processing, setProcessing] = useState(false)

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

  // Soft Delete handler
  const handleSoftDelete = async () => {
    if (!deleteTarget) return
    try {
      setProcessing(true)
      await furnitureService.deleteFurniture(
        deleteTarget.id,
        deleteTarget.name,
        deleteTarget,
      )
      setDeleteTarget(null)
      await refetch()
    } finally {
      setProcessing(false)
    }
  }

  // Restore handler (Kembalikan item yang sudah di-soft delete)
  const handleRestoreItem = async (item) => {
    try {
      setProcessing(true)
      await furnitureService.restoreFurniture(item)
      await refetch()
    } finally {
      setProcessing(false)
    }
  }

  // Hard Delete handler (Hapus permanen dari database)
  const handleHardDelete = async () => {
    if (!hardDeleteTarget) return
    try {
      setProcessing(true)
      await furnitureService.hardDeleteFurniture(
        hardDeleteTarget.id,
        hardDeleteTarget.name,
      )
      setHardDeleteTarget(null)
      await refetch()
    } finally {
      setProcessing(false)
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
          <h2>
            {showTrash
              ? `Tempat Sampah Katalog (${deletedFurnitures.length} Item Terhapus Sementara)`
              : `Koleksi Pilihan (${filteredFurnitures.length} Produk)`}
          </h2>
          <div className="list-head-right" style={{ flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn btn--sm ${showTrash ? 'btn--primary' : 'btn--outline'}`}
              onClick={() => setShowTrash((prev) => !prev)}
              title="Lihat item yang di-soft delete untuk dipulihkan atau dihapus permanen"
            >
              <Trash2 size={14} />{' '}
              {showTrash
                ? 'Kembali ke Katalog Aktif'
                : `Tempat Sampah (${deletedFurnitures.length})`}
            </button>

            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={refetch}
              title="Perbarui tampilan katalog"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Segarkan
            </button>

            {onNavigate && !showTrash && (
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

        {/* Tampilan Tempat Sampah (Soft-Deleted Items: Restore & Hard Delete) */}
        {showTrash ? (
          deletedFurnitures.length === 0 ? (
            <div className="state-box">
              <Trash2 size={28} stroke="var(--steel)" />
              <p>Tempat sampah kosong. Belum ada item katalog yang dihapus.</p>
            </div>
          ) : (
            <ul className="stock" style={{ marginTop: 16 }}>
              {deletedFurnitures.map((item) => (
                <li key={item.id || item.name} className="card" style={{ opacity: 0.92 }}>
                  <div className="card-btn" style={{ cursor: 'default' }}>
                    <img
                      className="card-img"
                      src={item.image_url || '/furniture/chair.jpg'}
                      alt={item.name}
                    />
                    <span className="name display">{item.name}</span>
                    <span className="type">
                      {item.category || item.type} · {item.material || item.caliber}
                    </span>
                    <span className="price">{formatPrice(item.price)}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      padding: '0 16px 16px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      style={{ flex: 1 }}
                      onClick={() => handleRestoreItem(item)}
                      disabled={processing}
                    >
                      <RotateCcw size={14} /> Kembalikan
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      style={{ flex: 1 }}
                      onClick={() => setHardDeleteTarget(item)}
                      disabled={processing}
                    >
                      <Trash2 size={14} /> Hapus Permanen
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : (
          <>
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
          </>
        )}
      </section>

      {/* Modal Konfirmasi Soft Delete */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Pindahkan ke Tempat Sampah (Soft Delete)"
        message={`Apakah Anda yakin ingin menghapus sementara "${deleteTarget?.name}"? Anda tetap dapat memulihkan atau menghapusnya secara permanen melalui menu Tempat Sampah.`}
        confirmLabel="Ya, Soft Delete"
        cancelLabel="Batal"
        danger
        loading={processing}
        onConfirm={handleSoftDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Modal Konfirmasi Hard Delete Permanen */}
      <ConfirmModal
        open={Boolean(hardDeleteTarget)}
        title="Hapus Permanen (Hard Delete)"
        message={`Apakah Anda yakin ingin menghapus "${hardDeleteTarget?.name}" secara permanen dari database? Tindakan ini tidak dapat dikembalikan.`}
        confirmLabel="Hapus Permanen"
        cancelLabel="Batal"
        danger
        loading={processing}
        onConfirm={handleHardDelete}
        onCancel={() => setHardDeleteTarget(null)}
      />
    </>
  )
}
