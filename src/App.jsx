import { useState } from 'react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import CatalogPage from './pages/CatalogPage.jsx'
import FavoritesPage from './pages/FavoritesPage.jsx'
import CartPage from './pages/CartPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import CreateFurniturePage from './pages/CreateFurniturePage.jsx'
import EditFurniturePage from './pages/EditFurniturePage.jsx'
import FurnitureDetail from './components/furniture/FurnitureDetail.jsx'
import PWABadge from './components/PWABadge.jsx'
import ConfirmModal from './components/modals/ConfirmModal.jsx'
import SplashScreen from './components/common/SplashScreen.jsx'
import furnitureService from './services/furnitureService.js'
import './App.css'

export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return !(params.get('produk') || params.get('item'))
  })
  const [tab, setTab] = useState('Catalog')
  const [mode, setMode] = useState('list') // 'list' | 'create' | 'edit' | 'detail'
  const [selectedFurniture, setSelectedFurniture] = useState(null)
  const [editingFurniture, setEditingFurniture] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const handleNavigate = (target, payload) => {
    if (target === 'Create') {
      setMode('create')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Edit') {
      setEditingFurniture(payload)
      setMode('edit')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Detail') {
      setSelectedFurniture(payload)
      setMode('detail')
      if (payload?.id) {
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}?produk=${encodeURIComponent(payload.id)}`,
        )
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      setTab(target)
      setMode('list')
      setSelectedFurniture(null)
      setEditingFurniture(null)
      window.history.replaceState(null, '', window.location.pathname)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBackToList = () => {
    setMode('list')
    setSelectedFurniture(null)
    setEditingFurniture(null)
    window.history.replaceState(null, '', window.location.pathname)
  }

  return (
    <div className="shell">
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      <Header
        tab={mode === 'list' ? tab : ''}
        onTab={(newTab) => handleNavigate(newTab)}
        onNavigateCreate={() => handleNavigate('Create')}
      />

      <main className="main">
        {mode === 'create' && (
          <CreateFurniturePage
            onBack={handleBackToList}
            onSuccess={() => {
              handleBackToList()
              setTab('Catalog')
            }}
          />
        )}

        {mode === 'edit' && (
          <EditFurniturePage
            furniture={editingFurniture}
            furnitureId={editingFurniture?.id}
            onBack={handleBackToList}
            onSuccess={() => {
              handleBackToList()
              setTab('Catalog')
            }}
          />
        )}

        {mode === 'detail' && selectedFurniture && (
          <FurnitureDetail
            furniture={selectedFurniture}
            onBack={handleBackToList}
            onEdit={(f) => handleNavigate('Edit', f)}
            onDelete={(f) => setDeleteTarget(f)}
            onNavigateCart={() => handleNavigate('Cart')}
          />
        )}

        {mode === 'list' && (
          <>
            {tab === 'Catalog' && (
              <CatalogPage
                onNavigate={(destination, payload) => handleNavigate(destination, payload)}
              />
            )}
            {tab === 'Favorites' && (
              <FavoritesPage
                onSelectFurniture={(f) => handleNavigate('Detail', f)}
                onNavigateCatalog={() => setTab('Catalog')}
              />
            )}
            {tab === 'Cart' && (
              <CartPage onNavigateCatalog={() => setTab('Catalog')} />
            )}
            {tab === 'Profile' && (
              <ProfilePage onReplaySplash={() => setShowSplash(true)} />
            )}
          </>
        )}
      </main>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Hapus Koleksi Furnitur"
        message={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name}" dari katalog?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        danger
        loading={deleting}
        onConfirm={async () => {
          if (!deleteTarget) return
          try {
            setDeleting(true)
            await furnitureService.deleteFurniture(deleteTarget.id, deleteTarget.name)
            setDeleteTarget(null)
            handleBackToList()
            setTab('Catalog')
          } finally {
            setDeleting(false)
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <PWABadge />
      <Footer />
    </div>
  )
}
