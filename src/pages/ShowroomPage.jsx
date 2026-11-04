import { useState } from 'react'
import {
  MapPin,
  Clock,
  Phone,
  ShieldCheck,
  Hammer,
  Database,
  RefreshCw,
  Key,
  Copy,
  Check,
} from 'lucide-react'
import {
  getActiveEnvConfig,
  saveActiveEnvConfig,
  resetActiveEnvConfig,
} from '../config/api'
import furnitureService from '../services/furnitureService'
import FURNITURES_LOCAL from '../data/furnitures'

export default function ShowroomPage() {
  const [envForm, setEnvForm] = useState(() => getActiveEnvConfig())
  const [statusMsg, setStatusMsg] = useState(
    'Terhubung dengan konfigurasi .env Supabase (Dual-Mode: Supabase PostgREST + LocalStorage).',
  )
  const [syncing, setSyncing] = useState(false)
  const [copiedEnv, setCopiedEnv] = useState(false)

  const handleSaveEnv = (e) => {
    e.preventDefault()
    saveActiveEnvConfig(envForm)
    setStatusMsg(`Konfigurasi .env diperbarui ke: ${envForm.VITE_API_BASE_URL}`)
  }

  const handleTestConnection = async () => {
    try {
      setSyncing(true)
      const res = await furnitureService.getFurnitures({ limit: 50 })
      setStatusMsg(
        `Koneksi berhasil! Ditemukan ${res.data?.length || 0} produk terintegrasi (Mode: ${res.source || 'hybrid'}).`,
      )
    } catch (err) {
      setStatusMsg(`Fallback LocalStorage Aktif: ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  const handleSeedSupabase = async () => {
    try {
      setSyncing(true)
      let count = 0
      for (const item of FURNITURES_LOCAL) {
        await furnitureService.createFurniture(item)
        count++
      }
      setStatusMsg(`Berhasil menyinkronkan ${count} produk furniture ke database Supabase!`)
    } catch (err) {
      setStatusMsg(`Gagal seed ke server: ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  const handleCopyEnv = () => {
    const content = `VITE_API_BASE_URL=${envForm.VITE_API_BASE_URL}\nVITE_SUPABASE_PUBLISHABLE_KEY=${envForm.VITE_SUPABASE_PUBLISHABLE_KEY}\nVITE_SUPABASE_BUCKET=${envForm.VITE_SUPABASE_BUCKET || 'guns'}`
    navigator.clipboard?.writeText(content)
    setCopiedEnv(true)
    setTimeout(() => setCopiedEnv(false), 2000)
  }

  return (
    <div className="page">
      <h1 className="display">Showroom &amp; Konfigurasi Database Supabase (.env)</h1>
      <p className="lede" style={{ marginBottom: 28 }}>
        Informasi galeri fisik Kayu &amp; Ruang di Semarang &amp; Jepara, serta manajemen integrasi environment database Supabase.
      </p>

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

      {/* Panel Konfigurasi .env & Supabase */}
      <div className="card-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <h3 className="card-box-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Database size={18} color="var(--brass)" /> Environment (.env) &amp; Koneksi Supabase REST API
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--steel)', margin: 0 }}>{statusMsg}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn--outline btn--sm" onClick={handleTestConnection} disabled={syncing}>
              <RefreshCw size={14} className={syncing ? 'spin' : ''} /> Uji Koneksi Supabase
            </button>
            <button type="button" className="btn btn--primary btn--sm" onClick={handleSeedSupabase} disabled={syncing}>
              <Database size={14} /> Seed 6 Produk ke Supabase
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveEnv} className="entry-form">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">VITE_API_BASE_URL</label>
              <input
                type="url"
                className="form-input"
                value={envForm.VITE_API_BASE_URL}
                onChange={(e) => setEnvForm((p) => ({ ...p, VITE_API_BASE_URL: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">VITE_SUPABASE_PUBLISHABLE_KEY</label>
              <input
                type="text"
                className="form-input"
                value={envForm.VITE_SUPABASE_PUBLISHABLE_KEY}
                onChange={(e) => setEnvForm((p) => ({ ...p, VITE_SUPABASE_PUBLISHABLE_KEY: e.target.value }))}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn--primary btn--sm">
                <Key size={14} /> Simpan &amp; Terapkan .env
              </button>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() => {
                  const def = resetActiveEnvConfig()
                  setEnvForm(def)
                  setStatusMsg('Dikembalikan ke konfigurasi .env default Modul 5.')
                }}
              >
                Reset Default
              </button>
            </div>

            <button type="button" className="btn btn--outline btn--sm" onClick={handleCopyEnv}>
              {copiedEnv ? <Check size={14} /> : <Copy size={14} />} Salin Isi File .env
            </button>
          </div>
        </form>
      </div>

      <div className="card-box">
        <h3 className="card-box-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} color="var(--brass)" /> Keunggulan Arsitektur PWA Kayu &amp; Ruang
        </h3>
        <ul className="detail-specs" style={{ marginTop: 14 }}>
          <li>
            <strong>Supabase PostgREST Integration:</strong> Terhubung langsung ke tabel <code>public.products</code>, <code>public.favorites</code>, dan <code>public.reviews</code> melalui Axios Interceptor.
          </li>
          <li>
            <strong>Offline-First Fallback:</strong> Service Worker Workbox &amp; LocalStorage menjaga katalog dan CRUD tetap berjalan meskipun tanpa koneksi internet.
          </li>
          <li>
            <strong>Full CRUD Fungsional:</strong> Tambah produk furniture baru, unggah foto, edit spesifikasi dimensi, dan hapus item secara interaktif.
          </li>
          <li>
            <strong>SQL Schema Ready:</strong> Tersedia file <code>supabase/schema.sql</code> di dalam proyek untuk inisialisasi tabel dan kebijakan RLS secara instan.
          </li>
        </ul>
      </div>
    </div>
  )
}
