import { useState, useEffect } from 'react'
import {
  User,
  Check,
  Save,
  Heart,
  Camera,
  Play,
  Package,
  ShoppingBag,
  Pencil,
  X,
  Loader,
} from 'lucide-react'
import userService from '../services/userService'
import { useFavorites } from '../hooks/useFavorites'
import { useFurnitures } from '../hooks/useFurnitures'
import { useCart } from '../hooks/useCart'

export default function ProfilePage({ onReplaySplash }) {
  const [profile, setProfile] = useState(() => userService.getUserProfile())
  const [username, setUsername] = useState(profile.username || '')
  const [nim, setNim] = useState(profile.nim || '')
  const [kelompok, setKelompok] = useState(profile.kelompok || '')
  const [prodi, setProdi] = useState(profile.prodi || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [avatar, setAvatar] = useState(profile.avatar_url || profile.avatar || null)

  // Form edit disembunyikan secara default; hanya tampil saat tombol "Edit Profil" diklik
  const [isEditing, setIsEditing] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [feedback, setFeedback] = useState('')

  const { favorites } = useFavorites()
  const { furnitures } = useFurnitures({ limit: 100 })
  const { totalCount: cartCount } = useCart()

  useEffect(() => {
    let mounted = true
    userService.fetchProfileFromSupabase().then((res) => {
      if (mounted && res.success && res.data) {
        setProfile(res.data)
        setUsername(res.data.username || '')
        setNim(res.data.nim || '')
        setKelompok(res.data.kelompok || '')
        setProdi(res.data.prodi || '')
        setBio(res.data.bio || '')
        setAvatar(res.data.avatar_url || res.data.avatar || null)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  const handleOpenEdit = () => {
    setUsername(profile.username || '')
    setNim(profile.nim || '')
    setKelompok(profile.kelompok || '')
    setProdi(profile.prodi || '')
    setBio(profile.bio || '')
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setUsername(profile.username || '')
    setNim(profile.nim || '')
    setKelompok(profile.kelompok || '')
    setProdi(profile.prodi || '')
    setBio(profile.bio || '')
    setIsEditing(false)
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
        setFeedback('Foto profil berhasil diperbarui.')
        setTimeout(() => setFeedback(''), 3500)
      }
    } catch (err) {
      setFeedback(err.message || 'Gagal memperbarui foto profil.')
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
        setIsEditing(false)
        setFeedback('Profil berhasil diperbarui!')
        setTimeout(() => setFeedback(''), 3500)
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
          <h1 className="display">Profil Pengguna</h1>
          <p className="lede">
            Informasi identitas anggota, koleksi favorit, dan ringkasan aktivitas belanja Anda di Kayu &amp; Ruang.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {!isEditing && (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={handleOpenEdit}
            >
              <Pencil size={14} /> Edit Profil
            </button>
          )}
          {onReplaySplash && (
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={onReplaySplash}
            >
              <Play size={14} /> Putar Intro
            </button>
          )}
        </div>
      </section>

      {feedback && (
        <div className="toast toast--success">
          <Check size={18} /> {feedback}
        </div>
      )}

      {/* Kartu Profil Utama */}
      <div className="profile-card">
        <div
          className="profile-card-top"
          style={{ justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
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
                title="Ganti Foto Profil"
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
              <p style={{ margin: '0 0 4px', fontWeight: 600, color: 'var(--brass)' }}>
                NIM: {profile.nim} · {profile.kelompok}
              </p>
              <p style={{ margin: '0 0 6px', fontSize: '0.88rem', color: 'var(--steel)' }}>
                {profile.prodi}
              </p>
              {profile.bio && (
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--ink)', maxWidth: '58ch' }}>
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

          {!isEditing && (
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={handleOpenEdit}
              style={{ alignSelf: 'flex-start' }}
            >
              <Pencil size={14} /> Edit Profil
            </button>
          )}
        </div>

        <div className="profile-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="stat-item">
            <Package size={20} stroke="var(--brass)" />
            <div className="stat-val">{furnitures.length}</div>
            <div className="stat-label">Koleksi Katalog</div>
          </div>
          <div className="stat-item">
            <Heart size={20} stroke="var(--brass)" />
            <div className="stat-val">{favorites.length}</div>
            <div className="stat-label">Furnitur Favorit</div>
          </div>
          <div className="stat-item">
            <ShoppingBag size={20} stroke="var(--brass)" />
            <div className="stat-val">{cartCount}</div>
            <div className="stat-label">Isi Keranjang</div>
          </div>
        </div>
      </div>

      {/* Form Edit Profil — Hanya tampil apabila tombol "Edit Profil" diklik */}
      {isEditing && (
        <form onSubmit={handleSaveProfile} className="profile-form">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="section-title">Edit Informasi Profil</h3>
            <button
              type="button"
              className="icon-btn"
              onClick={handleCancelEdit}
              title="Tutup form edit"
            >
              <X size={16} />
            </button>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nama Lengkap *</label>
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
              <label className="form-label">Kelompok *</label>
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
            <label className="form-label">Tentang Saya / Catatan</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="form-textarea"
            />
          </div>

          <div className="form-actions-bar">
            <button
              type="button"
              className="btn btn--outline"
              onClick={handleCancelEdit}
              disabled={savingProfile}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={savingProfile}
            >
              <Save size={16} /> {savingProfile ? 'Menyimpan…' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
