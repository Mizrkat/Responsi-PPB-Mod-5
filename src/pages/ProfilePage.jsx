import { useState } from 'react'
import {
  User,
  Copy,
  Check,
  Save,
  Heart,
  FileText,
  Camera,
  Play,
  Package,
} from 'lucide-react'
import userService from '../services/userService'
import { useFavorites } from '../hooks/useFavorites'
import { readLocalCatalog } from '../services/furnitureService'

export default function ProfilePage({ onReplaySplash }) {
  const [profile, setProfile] = useState(() => userService.getUserProfile())
  const [username, setUsername] = useState(profile.username || '')
  const [nim, setNim] = useState(profile.nim || '')
  const [kelompok, setKelompok] = useState(profile.kelompok || '')
  const [prodi, setProdi] = useState(profile.prodi || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [avatar, setAvatar] = useState(profile.avatar || null)
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState('')

  const { favorites } = useFavorites()
  const catalogCount = readLocalCatalog().length

  const handleCopyId = () => {
    if (profile.userId) {
      navigator.clipboard.writeText(profile.userId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target.result
      setAvatar(base64)
      userService.updateAvatar(base64)
      setFeedback('Foto profil berhasil diperbarui.')
      setTimeout(() => setFeedback(''), 3000)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = (e) => {
    e.preventDefault()
    const updated = {
      ...profile,
      username: username.trim() || 'Mahasiswa Praktikan',
      nim: nim.trim() || '21120123140001',
      kelompok: kelompok.trim() || 'Kelompok 05',
      prodi: prodi.trim(),
      bio: bio.trim(),
      avatar,
    }
    const result = userService.saveUserProfile(updated)
    if (result.success) {
      setProfile(result.data)
      setFeedback('Identitas profil praktikan (Nama, NIM, Kelompok) berhasil disimpan!')
      setTimeout(() => setFeedback(''), 3500)
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
          <h1 className="display">Profil Praktikan</h1>
          <p className="lede">
            Halaman identitas pembuat aplikasi PWA (Nama, NIM, dan Kelompok) sesuai syarat tugas Praktikum Pemrograman Perangkat Bergerak Modul 5.
          </p>
        </div>
        {onReplaySplash && (
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={onReplaySplash}
          >
            <Play size={14} /> Putar Ulang Splash Screen
          </button>
        )}
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
            <label htmlFor="avatar-file-input" className="avatar-upload-btn" title="Unggah Foto">
              <Camera size={14} />
              <input
                id="avatar-file-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden-file-input"
              />
            </label>
          </div>

          <div className="profile-identity">
            <h2 className="display">{profile.username}</h2>
            <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--brass)' }}>
              NIM: {profile.nim} · {profile.kelompok}
            </p>
            <div className="profile-id-row">
              <span className="mono-badge">UUID: {profile.userId}</span>
              <button
                type="button"
                className="icon-btn"
                onClick={handleCopyId}
                title="Salin UUID"
              >
                {copied ? <Check size={14} color="var(--brass)" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>

        <div className="profile-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="stat-item">
            <Package size={20} stroke="var(--brass)" />
            <div className="stat-val">{catalogCount}</div>
            <div className="stat-label">Produk di Katalog</div>
          </div>
          <div className="stat-item">
            <Heart size={20} stroke="var(--brass)" />
            <div className="stat-val">{favorites.length}</div>
            <div className="stat-label">Furniture Favorit</div>
          </div>
          <div className="stat-item">
            <FileText size={20} stroke="var(--steel)" />
            <div className="stat-val">PWA Ready</div>
            <div className="stat-label">Offline &amp; Installable</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="profile-form">
        <h3 className="section-title">Edit Data Praktikan (Nama, NIM, Kelompok)</h3>

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
          <label className="form-label">Catatan / Deskripsi Proyek</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="form-textarea"
          />
        </div>

        <button type="submit" className="btn btn--primary" style={{ alignSelf: 'flex-start' }}>
          <Save size={16} /> Simpan Data Profil
        </button>
      </form>
    </div>
  )
}
