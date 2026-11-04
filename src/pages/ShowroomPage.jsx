import { useState, useEffect } from 'react'
import {
  MapPin,
  Clock,
  Phone,
  ShieldCheck,
  Hammer,
  Database,
  RefreshCw,
  FolderOpen,
} from 'lucide-react'
import { apiClient, BASE_URL, IS_SUPABASE } from '../config/api'
import { useFurnitures } from '../hooks/useFurnitures'
import { useFavorites } from '../hooks/useFavorites'
import userService from '../services/userService'
import uploadService from '../services/uploadService'
import { formatPrice } from '../utils/helpers'

export default function ShowroomPage() {
  const { furnitures, source: furnSource, refetch: refetchFurnitures } = useFurnitures({ limit: 50 })
  const { favorites, refetch: refetchFavorites } = useFavorites()
  const [profilesList, setProfilesList] = useState([])
  const [reviewsList, setReviewsList] = useState([])
  const [bucketFiles, setBucketFiles] = useState([])
  const [loadingDb, setLoadingDb] = useState(false)

  const fetchAllTables = async () => {
    setLoadingDb(true)
    try {
      await refetchFurnitures()
      await refetchFavorites()

      if (IS_SUPABASE && navigator.onLine) {
        try {
          const profs = await apiClient.get('/rest/v1/profiles?select=*&order=updated_at.desc&limit=20')
          if (Array.isArray(profs)) setProfilesList(profs)
        } catch {
          setProfilesList([userService.getUserProfile()])
        }

        try {
          const revs = await apiClient.get('/rest/v1/reviews?select=*&order=created_at.desc&limit=20')
          if (Array.isArray(revs)) setReviewsList(revs)
        } catch {
          setReviewsList([])
        }

        const storageRes = await uploadService.listFiles('furnitures', 'products')
        if (storageRes.success) {
          setBucketFiles(storageRes.data || [])
        }
      } else {
        setProfilesList([userService.getUserProfile()])
      }
    } finally {
      setLoadingDb(false)
    }
  }

  useEffect(() => {
    fetchAllTables()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 className="display">Showroom &amp; Data Tabel Supabase</h1>
          <p className="lede">
            Menampilkan isi langsung dari tabel-tabel database Supabase (<code>public.furnitures</code>, <code>public.profiles</code>, <code>public.favorites</code>, <code>public.reviews</code>) serta Storage Bucket <code>furnitures</code>.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={fetchAllTables}
          disabled={loadingDb}
        >
          <RefreshCw size={14} className={loadingDb ? 'spin' : ''} /> Segarkan Tabel Supabase
        </button>
      </div>

      {/* Ringkasan Tabel Supabase */}
      <div className="card-box">
        <h3 className="card-box-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Database size={18} color="var(--brass)" /> Status Koneksi &amp; Isi Tabel Database Supabase
        </h3>
        <p className="card-box-desc" style={{ marginBottom: 14 }}>
          Endpoint Aktif:{' '}
          <strong>
            {IS_SUPABASE ? BASE_URL : 'Mode Penyimpanan Lokal (Isi .env untuk koneksi cloud)'}
          </strong>{' '}
          ({furnSource === 'supabase' ? 'Terhubung ke Supabase' : 'LocalStorage Fallback'})
        </p>

        {/* Tabel 1: public.profiles */}
        <h4 style={{ margin: '16px 0 8px', fontSize: '0.95rem' }}>
          1. Isi Tabel <code>public.profiles</code> ({profilesList.length} Baris)
        </h4>
        <div style={{ overflowX: 'auto', marginBottom: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--paper)', textAlign: 'left', borderBottom: '2px solid var(--line)' }}>
                <th style={{ padding: '8px 10px' }}>Nama (username)</th>
                <th style={{ padding: '8px 10px' }}>NIM</th>
                <th style={{ padding: '8px 10px' }}>Kelompok</th>
                <th style={{ padding: '8px 10px' }}>Prodi</th>
              </tr>
            </thead>
            <tbody>
              {profilesList.map((p, idx) => (
                <tr key={p.id || idx} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>{p.username}</td>
                  <td style={{ padding: '8px 10px' }}>{p.nim}</td>
                  <td style={{ padding: '8px 10px' }}>{p.kelompok}</td>
                  <td style={{ padding: '8px 10px' }}>{p.prodi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tabel 2: public.furnitures */}
        <h4 style={{ margin: '16px 0 8px', fontSize: '0.95rem' }}>
          2. Isi Tabel <code>public.furnitures</code> ({furnitures.length} Baris)
        </h4>
        <div style={{ overflowX: 'auto', marginBottom: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--paper)', textAlign: 'left', borderBottom: '2px solid var(--line)' }}>
                <th style={{ padding: '8px 10px' }}>ID</th>
                <th style={{ padding: '8px 10px' }}>Nama Produk</th>
                <th style={{ padding: '8px 10px' }}>Kategori</th>
                <th style={{ padding: '8px 10px' }}>Material</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Harga</th>
              </tr>
            </thead>
            <tbody>
              {furnitures.map((f) => (
                <tr key={f.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{f.id}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>{f.name}</td>
                  <td style={{ padding: '8px 10px' }}>{f.category || f.type}</td>
                  <td style={{ padding: '8px 10px' }}>{f.material || f.caliber}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--brass)' }}>
                    {formatPrice(f.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Statistik Tabel Favorites, Reviews & Storage Bucket */}
        <ul className="detail-specs">
          <li>
            <strong>Tabel <code>public.favorites</code>:</strong> {favorites.length} item tersimpan
          </li>
          <li>
            <strong>Tabel <code>public.reviews</code>:</strong> {reviewsList.length} ulasan pelanggan
          </li>
          <li>
            <strong>Storage Bucket <code>furnitures</code>:</strong> {bucketFiles.length} file gambar terunggah
          </li>
        </ul>

        {bucketFiles.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FolderOpen size={15} color="var(--brass)" /> File di Supabase Storage Bucket (<code>furnitures/products</code>):
            </h4>
            <ul className="detail-specs">
              {bucketFiles.slice(0, 6).map((file, i) => (
                <li key={i}>
                  <a href={file.publicUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--brass)', fontWeight: 600 }}>
                    {file.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Lokasi Showroom */}
      <div className="form-grid" style={{ marginBottom: 24 }}>
        <div className="card-box" style={{ marginBottom: 0 }}>
          <h3 className="card-box-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} color="var(--brass)" /> Galeri Semarang
          </h3>
          <p className="card-box-desc" style={{ marginBottom: 8 }}>
            Jl. Pemuda No. 118, Sekayu, Kec. Semarang Tengah, Kota Semarang, Jawa Tengah 50132
          </p>
          <p style={{ fontSize: '0.88rem', color: 'var(--steel)', margin: 0 }}>
            <Clock size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Selasa – Minggu: 09.00 – 20.00 WIB
          </p>
        </div>

        <div className="card-box" style={{ marginBottom: 0 }}>
          <h3 className="card-box-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Hammer size={18} color="var(--brass)" /> Workshop Produksi Jepara
          </h3>
          <p className="card-box-desc" style={{ marginBottom: 8 }}>
            Kawasan Industri Kriya Kayu Tahunan, Kab. Jepara, Jawa Tengah
          </p>
          <p style={{ fontSize: '0.88rem', color: 'var(--steel)', margin: 0 }}>
            <Phone size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Konsultasi Custom Interior: (024) 358-4410
          </p>
        </div>
      </div>

      <div className="card-box">
        <h3 className="card-box-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} color="var(--brass)" /> Arsitektur Database &amp; Storage PWA
        </h3>
        <ul className="detail-specs" style={{ marginTop: 14 }}>
          <li>
            <strong>4 Tabel Relasional Supabase:</strong> <code>furnitures</code>, <code>profiles</code>, <code>favorites</code>, dan <code>reviews</code>.
          </li>
          <li>
            <strong>Supabase Storage Bucket:</strong> Setiap foto produk dan foto profil yang diunggah disimpan langsung ke bucket <code>furnitures</code> &amp; <code>avatars</code>.
          </li>
          <li>
            <strong>Full CRUD Fungsional:</strong> Tambah, tampilkan, ubah, dan hapus data langsung tercermin pada tabel database.
          </li>
          <li>
            <strong>Offline-First PWA:</strong> Tetap bekerja secara offline dengan sinkronisasi cache otomatis.
          </li>
        </ul>
      </div>
    </div>
  )
}
