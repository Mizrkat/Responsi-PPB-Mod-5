import { useState, useEffect } from 'react'
import {
  User,
  Copy,
  Check,
  Save,
  Heart,
  Camera,
  Play,
  Package,
  Database,
  RefreshCw,
  Loader,
} from 'lucide-react'
import userService from '../services/userService'
import { useFavorites } from '../hooks/useFavorites'
import { useFurnitures } from '../hooks/useFurnitures'

export default function ProfilePage({ onReplaySplash }) {
  const [profile, setProfile] = useState(() => userService.getUserProfile())
  const [username, setUsername] = useState(profile.username || '')
  const [nim, setNim] = useState(profile.nim || '')
  const [kelompok, setKelompok] = useState(profile.kelompok || '')
  const [prodi, setProdi] = useState(profile.prodi || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [avatar, setAvatar] = useState(profile.avatar_url || profile.avatar || null)

  const [loadingProfile, setLoadingProfile] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [dataSource, setDataSource] = useState('local')
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState('')

  const { favorites } = useFavorites()
  const { furnitures } = useFurnitures({ limit: 100 })

  const loadProfileFromDb = async () => {
    try {
      setLoadingProfile(true)
      const res = await userService.fetchProfileFromSupabase()
      if (res.success && res.data) {
        setProfile(res.data)
        setUsername(res.data.username || '')
        setNim(res.data.nim || '')
        setKelompok(res.data.kelompok || '')
        setProdi(res.data.prodi || '')
        setBio(res.data.bio || '')
        setAvatar(res.data.avatar_url || res.data.avatar || null)
        setDataSource(res.source || 'local')
      }
    } finally {
      setLoadingProfile(false)
    }
  }

  useEffect(() => {
    loadProfileFromDb()
  }, [])

  const handleCopyId = () => {
    if (profile.userId) {
      navigator.clipboard?.writeText(profile.userId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploadingAvatar(true)
      const res = await userService.uploadAvatarToSupabase(file)
      if (res.success) {
        setAvatar(res.avatarUrl)
        setProfile(res.profile)
        setFeedback(
          res.source === 'supabase_storage'
            ? 'Foto profil berhasil diunggah ke Supabase Storage Bucket & disimpan di tabel public.profiles!'
            : 'Foto profil berhasil diperbarui (tersimpan secara lokal).',
        )
        setTimeout(() => setFeedback(''), 4000)
      }
    } catch (err) {
      setFeedback(err.message || 'Gagal mengunggah foto profil.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    try {
      setSavingProfile(true)
      const updated = {
        ...profile,
        username: username.trim() || 'Mahasiswa Praktikan',
        nim: nim.trim() || '21120123140001',
        kelompok: kelompok.trim() || 'Kelompok 05',
        prodi: prodi.trim(),
        bio: bio.trim(),
        avatar_url: avatar,
      }
      const result = await userService.saveProfileToSupabase(updated)
      if (result.success) {
        setProfile(result.data)
        setDataSource(result.source || 'local')
        setFeedback(
          result.source === 'supabase'
            ? 'Data profil akun berhasil disimpan ke tabel Supabase public.profiles!'
            : 'Data profil akun disimpan ke penyimpanan lokal (LocalStorage).',
        )
        setTimeout(() => setFeedback(''), 4000)
      }
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <div className="profile-page">
      <section
        className="masthead"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 className="display">Profil Akun Praktikan</h1>
          <p className="lede">
            Terhubung ke tabel <code>public.profiles</code> dan Storage Bucket <code>avatars</code> / <code>furnitures</code> di Supabase.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={loadProfileFromDb}
            disabled={loadingProfile}
          >
            <RefreshCw size={14} className={loadingProfile ? 'spin' : ''} /> Muat dari Supabase
          </button>
          {onReplaySplash && (
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={onReplaySplash}
            >
              <Play size={14} /> Putar Splash Screen
            </button>
          )}
        </div>
      </section>

      {feedback && (
        <div className="toast toast--success">
          <Check size={18} /> {feedback}
        </div>
      )}

      <div className="profile-card">
        <div className="profile-card-top">
          <div className="avatar-wrap">
            {avatar ? (
              <img src={avatar} alt={profile.username} className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                <User size={36} stroke="var(--brass)" />
              </div>
            )}
            <label
              htmlFor="avatar-file-input"
              className="avatar-upload-btn"
              title="Unggah Foto ke Supabase Storage Bucket"
            >
              {uploadingAvatar ? <Loader size={14} className="spin" /> : <Camera size={14} />}
              <input
                id="avatar-file-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden-file-input"
                disabled={uploadingAvatar}
              />
            </label>
          </div>

          <div className="profile-identity">
            <h2 className="display">{profile.username}</h2>
            <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--brass)' }}>
              NIM: {profile.nim} · {profile.kelompok}
            </p>
            <p style={{ margin: '0 0 8px', fontSize: '0.88rem', color: 'var(--steel)' }}>
              {profile.prodi}
            </p>
            <div className="profile-id-row" style={{ flexWrap: 'wrap' }}>
              <span className="mono-badge">user_id: {profile.userId}</span>
              <button
                type="button"
                className="icon-btn"
                onClick={handleCopyId}
                title="Salin UUID"
              >
                {copied ? <Check size={14} color="var(--brass)" /> : <Copy size={14} />}
              </button>
              <span className="mono-badge" style={{ color: dataSource === 'supabase' ? '#1e8449' : 'var(--steel)' }}>
                Sumber: {dataSource === 'supabase' ? 'Supabase (public.profiles)' : 'LocalStorage Cache'}
              </span>
            </div>
          </div>
        </div>

        <div className="profile-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="stat-item">
            <Package size={20} stroke="var(--brass)" />
            <div className="stat-val">{furnitures.length}</div>
            <div className="stat-label">Tabel public.furnitures</div>
          </div>
          <div className="stat-item">
            <Heart size={20} stroke="var(--brass)" />
            <div className="stat-val">{favorites.length}</div>
            <div className="stat-label">Tabel public.favorites</div>
          </div>
          <div className="stat-item">
            <Database size={20} stroke="var(--brass)" />
            <div className="stat-val">Aktif</div>
            <div className="stat-label">Tabel public.profiles</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="profile-form">
        <h3 className="section-title">
          Edit Data Tabel <code>public.profiles</code> (Nama, NIM, Kelompok)
        </h3>

        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Nama Lengkap (username) *</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan Nama Lengkap Anda"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">NIM (Nomor Induk Mahasiswa) *</label>
            <input
              type="text"
              value={nim}
              onChange={(e) => setNim(e.target.value)}
              placeholder="Contoh: 21120123140001"
              className="form-input"
              required
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Kelompok Praktikum *</label>
            <input
              type="text"
              value={kelompok}
              onChange={(e) => setKelompok(e.target.value)}
              placeholder="Contoh: Kelompok 05"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Program Studi / Universitas</label>
            <input
              type="text"
              value={prodi}
              onChange={(e) => setProdi(e.target.value)}
              placeholder="Teknik Komputer - Universitas Diponegoro"
              className="form-input"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Bio / Deskripsi Proyek</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="form-textarea"
          />
        </div>

        {avatar && String(avatar).startsWith('http') && (
          <div className="form-group">
            <label className="form-label">URL Avatar di Supabase Storage Bucket</label>
            <input type="text" value={avatar} readOnly className="form-input" />
          </div>
        )}

        <button
          type="submit"
          className="btn btn--primary"
          style={{ alignSelf: 'flex-start' }}
          disabled={savingProfile}
        >
          <Save size={16} />{' '}
          {savingProfile ? 'Menyimpan ke Supabase…' : 'Simpan ke Tabel public.profiles'}
        </button>
      </form>
    </div>
  )
}
