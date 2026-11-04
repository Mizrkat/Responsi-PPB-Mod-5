import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Plus,
  X,
  Save,
  Upload,
  Loader,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import furnitureService from '../services/furnitureService'
import uploadService from '../services/uploadService'

export default function EditFurniturePage({ furniture, furnitureId, onBack, onSuccess }) {
  const targetId = furnitureId || furniture?.id

  const [formData, setFormData] = useState({
    name: furniture?.name || '',
    type: furniture?.category || furniture?.type || 'Kursi',
    caliber: furniture?.material || furniture?.caliber || 'Kayu Jati Solid',
    difficulty:
      furniture?.assembly_type ||
      furniture?.difficulty ||
      'Siap Pakai (Fully Assembled)',
    price: furniture?.price ?? 3500000,
    description: furniture?.description || '',
    image_url: furniture?.image_url || '/furniture/chair.jpg',
    is_featured: Boolean(furniture?.is_featured),
  })

  const [specs, setSpecs] = useState(
    furniture?.ingredients?.length > 0
      ? furniture.ingredients
      : furniture?.specs?.length > 0
      ? furniture.specs
      : [{ name: 'Dimensi', quantity: 'Standar' }],
  )
  const [steps, setSteps] = useState(
    furniture?.steps?.length > 0
      ? furniture.steps.map((s) => (typeof s === 'string' ? s : s.instruction || ''))
      : ['Bersihkan menggunakan kain kering lembut.'],
  )

  const [uploading, setUploading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (!furniture && targetId) {
      furnitureService.getFurnitureById(targetId).then((res) => {
        if (res.success && res.data) {
          const d = res.data
          setFormData({
            name: d.name,
            type: d.category || d.type,
            caliber: d.material || d.caliber,
            difficulty: d.assembly_type || d.difficulty || 'Siap Pakai (Fully Assembled)',
            price: d.price,
            description: d.description,
            image_url: d.image_url,
            is_featured: Boolean(d.is_featured),
          })
          if (d.ingredients?.length) setSpecs(d.ingredients)
          if (d.steps?.length) setSteps(d.steps)
        }
      })
    }
  }, [furniture, targetId])

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploading(true)
      setError('')
      const res = await uploadService.uploadImage(file, 'furnitures', 'products')
      if (res.success && res.data?.url) {
        setFormData((p) => ({ ...p, image_url: res.data.url }))
        setSuccessMsg(
          res.source === 'supabase_storage'
            ? 'Foto baru berhasil diunggah ke Supabase Storage Bucket!'
            : 'Foto baru berhasil dimuat!',
        )
        setTimeout(() => setSuccessMsg(''), 3000)
      }
    } catch (err) {
      setError(err.message || 'Gagal mengunggah foto baru.')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError('Nama produk wajib diisi.')
      return
    }
    try {
      setUpdating(true)
      setError('')
      const cleanSpecs = specs
        .filter((s) => s.name && s.name.trim())
        .map((s) => ({ name: s.name.trim(), quantity: (s.quantity || 'Standar').trim() }))
      const cleanSteps = steps.filter((s) => s && s.trim()).map((s) => s.trim())

      const res = await furnitureService.updateFurniture(targetId, {
        name: formData.name.trim(),
        category: formData.type,
        type: formData.type,
        material: formData.caliber.trim(),
        caliber: formData.caliber.trim(),
        assembly_type: formData.difficulty,
        difficulty: formData.difficulty,
        price: Number(formData.price) || 0,
        description: formData.description.trim(),
        image_url: formData.image_url,
        is_featured: Boolean(formData.is_featured),
        specs: cleanSpecs,
        ingredients: cleanSpecs,
        steps: cleanSteps,
      })
      if (res.success) {
        setSuccessMsg('Perubahan berhasil disimpan ke database!')
        if (onSuccess) onSuccess(res.data)
        else if (onBack) onBack()
      }
    } catch (err) {
      setError(err.message || 'Gagal memperbarui produk.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="form-page">
      <div className="form-head">
        <button type="button" className="detail-back" onClick={onBack}>
          <ArrowLeft size={18} /> Batal &amp; Kembali
        </button>
      </div>

      <div className="form-title-group">
        <h1 className="display">Perbarui Detail Furnitur</h1>
        <p className="lede">
          Perbarui informasi harga, spesifikasi material, maupun foto koleksi furnitur.
        </p>
      </div>

      {error && (
        <div className="toast toast--error">
          <AlertCircle size={18} /> {error}
        </div>
      )}
      {successMsg && (
        <div className="toast toast--success">
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="entry-form">
        {/* Foto Produk & Upload ke Storage Bucket */}
        <div className="selected-thumb-bar">
          <img src={formData.image_url} alt={formData.name} className="thumb-small" />
          <div className="thumb-info">
            <span className="thumb-title">Foto Produk Saat Ini</span>
            <span className="thumb-sub">Klik tombol di samping untuk mengganti foto tampilan produk</span>
          </div>
          <label className="btn btn--outline btn--sm" style={{ cursor: 'pointer' }}>
            {uploading ? (
              <>
                <Loader size={14} className="spin" /> Mengunggah…
              </>
            ) : (
              <>
                <Upload size={14} /> Ganti Foto
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleImageFileChange}
              className="hidden-file-input"
              disabled={uploading}
            />
          </label>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Nama Produk Furniture *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Kategori *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value }))}
              className="form-select"
            >
              <option value="Kursi">Kursi</option>
              <option value="Meja">Meja</option>
              <option value="Sofa">Sofa</option>
              <option value="Kabinet">Kabinet</option>
              <option value="Tempat Tidur">Tempat Tidur</option>
              <option value="Meja Kerja">Meja Kerja</option>
            </select>
          </div>
        </div>

        <div className="form-grid form-grid--3">
          <div className="form-group">
            <label className="form-label">Material Kayu &amp; Kain *</label>
            <input
              type="text"
              value={formData.caliber}
              onChange={(e) => setFormData((p) => ({ ...p, caliber: e.target.value }))}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Harga (IDR) *</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Tingkat Perakitan</label>
            <select
              value={formData.difficulty}
              onChange={(e) => setFormData((p) => ({ ...p, difficulty: e.target.value }))}
              className="form-select"
            >
              <option value="Siap Pakai (Fully Assembled)">Siap Pakai (Fully Assembled)</option>
              <option value="Knockdown Mudah (15 Menit)">Knockdown Mudah (15 Menit)</option>
              <option value="Custom / Instalasi Tim">Custom / Instalasi Tim</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Deskripsi Produk</label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
            className="form-textarea"
          />
        </div>

        <div className="form-fieldset">
          <div className="fieldset-header">
            <label className="form-label">Spesifikasi Dimensi &amp; Material</label>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => setSpecs((p) => [...p, { name: '', quantity: '' }])}
            >
              <Plus size={14} /> Tambah Spesifikasi
            </button>
          </div>
          <div className="multi-rows">
            {specs.map((spec, i) => (
              <div key={i} className="multi-row">
                <input
                  type="text"
                  value={spec.name}
                  onChange={(e) => {
                    const copy = [...specs]
                    copy[i] = { ...copy[i], name: e.target.value }
                    setSpecs(copy)
                  }}
                  className="form-input"
                />
                <input
                  type="text"
                  value={spec.quantity}
                  onChange={(e) => {
                    const copy = [...specs]
                    copy[i] = { ...copy[i], quantity: e.target.value }
                    setSpecs(copy)
                  }}
                  className="form-input"
                />
                <button
                  type="button"
                  className="btn btn--danger-ghost"
                  onClick={() => setSpecs((p) => p.filter((_, idx) => idx !== i))}
                  disabled={specs.length <= 1}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="form-fieldset">
          <div className="fieldset-header">
            <label className="form-label">Panduan Perakitan &amp; Perawatan</label>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => setSteps((p) => [...p, ''])}
            >
              <Plus size={14} /> Tambah Langkah
            </button>
          </div>
          <div className="multi-rows">
            {steps.map((st, i) => (
              <div key={i} className="step-row">
                <span className="step-num">{i + 1}</span>
                <input
                  type="text"
                  value={st}
                  onChange={(e) => {
                    const copy = [...steps]
                    copy[i] = e.target.value
                    setSteps(copy)
                  }}
                  className="form-input"
                />
                <button
                  type="button"
                  className="btn btn--danger-ghost"
                  onClick={() => setSteps((p) => p.filter((_, idx) => idx !== i))}
                  disabled={steps.length <= 1}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="form-actions-bar">
          <button type="button" className="btn btn--outline" onClick={onBack}>
            Batal
          </button>
          <button type="submit" className="btn btn--primary" disabled={updating}>
            <Save size={16} /> {updating ? 'Menyimpan Perubahan…' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </div>
  )
}
