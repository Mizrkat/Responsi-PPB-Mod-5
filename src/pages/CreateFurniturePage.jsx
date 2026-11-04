import { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  Upload,
  X,
  Plus,
  Loader,
  Save,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import furnitureService from '../services/furnitureService'
import uploadService from '../services/uploadService'
import {
  saveDraft,
  loadDraft,
  deleteDraft,
  hasDraft,
  getDraftTimestamp,
  formatDraftTime,
} from '../utils/draftStorage'
import ConfirmModal from '../components/modals/ConfirmModal'

const PRESET_IMAGES = [
  { label: 'Kursi Jati Bouclé', url: '/furniture/chair.jpg' },
  { label: 'Meja Makan Oak', url: '/furniture/table.jpg' },
  { label: 'Sofa Linen Sage', url: '/furniture/sofa.jpg' },
  { label: 'Kabinet Credenza', url: '/furniture/credenza.jpg' },
  { label: 'Tempat Tidur Jati', url: '/furniture/bed.jpg' },
  { label: 'Meja Kerja Walnut', url: '/furniture/desk.jpg' },
]

export default function CreateFurniturePage({ onBack, onSuccess }) {
  const [currentStep, setCurrentStep] = useState('upload')

  const [formData, setFormData] = useState({
    name: '',
    type: 'Kursi',
    caliber: 'Kayu Jati Solid Grade A',
    difficulty: 'Siap Pakai (Fully Assembled)',
    price: 4200000,
    description: '',
    is_featured: false,
  })

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('/furniture/chair.jpg')
  const [uploadedImageUrl, setUploadedImageUrl] = useState('/furniture/chair.jpg')

  const [specs, setSpecs] = useState([
    { name: 'Dimensi (P x L x T)', quantity: '75 x 80 x 78 cm' },
    { name: 'Material Utama', quantity: 'Kayu Jati Solid Perhutani' },
    { name: 'Finishing', quantity: 'Natural Waterbased Matte' },
  ])

  const [steps, setSteps] = useState([
    'Pasang rangka kaki kayu menggunakan kunci L dan baut baja yang tersedia.',
    'Bersihkan permukaan kayu dengan kain lembut kering secara berkala.',
  ])

  const [uploading, setUploading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [showDraftModal, setShowDraftModal] = useState(() => hasDraft('create'))
  const [draftTimestamp, setDraftTimestamp] = useState(() => getDraftTimestamp('create'))

  const handleSaveDraft = useCallback(
    (notify = true) => {
      const saved = saveDraft(
        { formData, specs, steps, uploadedImageUrl },
        'create',
      )
      if (saved) {
        const ts = getDraftTimestamp('create')
        setDraftTimestamp(ts)
        if (notify) {
          setSuccessMsg(`Draft tersimpan otomatis (${formatDraftTime(ts)})`)
          setTimeout(() => setSuccessMsg(''), 3000)
        }
      }
    },
    [formData, specs, steps, uploadedImageUrl],
  )

  useEffect(() => {
    if (currentStep !== 'form') return
    const interval = setInterval(() => handleSaveDraft(false), 30000)
    return () => clearInterval(interval)
  }, [handleSaveDraft, currentStep])

  const handleLoadDraft = () => {
    const draft = loadDraft('create')
    if (draft) {
      if (draft.formData) setFormData(draft.formData)
      if (draft.specs) setSpecs(draft.specs)
      if (draft.steps) setSteps(draft.steps)
      if (draft.uploadedImageUrl) {
        setUploadedImageUrl(draft.uploadedImageUrl)
        setImagePreview(draft.uploadedImageUrl)
        setCurrentStep('form')
      }
      setShowDraftModal(false)
      setSuccessMsg('Draft berhasil dipulihkan.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  const handleDiscardDraft = () => {
    deleteDraft('create')
    setShowDraftModal(false)
    setDraftTimestamp(null)
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setUploadedImageUrl('')
    setError('')
  }

  const handleSelectPreset = (url) => {
    setImageFile(null)
    setImagePreview(url)
    setUploadedImageUrl(url)
    setCurrentStep('form')
    setError('')
  }

  const handleUploadImage = async () => {
    if (!imageFile) {
      setUploadedImageUrl(uploadedImageUrl || imagePreview || '/furniture/chair.jpg')
      setCurrentStep('form')
      return
    }
    try {
      setUploading(true)
      setError('')
      const result = await uploadService.uploadImage(imageFile, 'furnitures', 'products')
      if (result.success && result.data?.url) {
        setUploadedImageUrl(result.data.url)
        setImagePreview(result.data.url)
        setImageFile(null)
        setCurrentStep('form')
        setSuccessMsg(
          result.source === 'supabase_storage'
            ? 'Foto berhasil diunggah ke Supabase Storage Bucket (furnitures)!'
            : 'Foto berhasil diproses!',
        )
        setTimeout(() => setSuccessMsg(''), 3000)
      }
    } catch (err) {
      setError(err.message || 'Gagal mengunggah gambar.')
    } finally {
      setUploading(false)
    }
  }

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSpecChange = (index, field, value) => {
    setSpecs((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const addSpec = () => setSpecs((prev) => [...prev, { name: '', quantity: '' }])
  const removeSpec = (index) => {
    if (specs.length <= 1) return
    setSpecs((prev) => prev.filter((_, i) => i !== index))
  }

  const handleStepChange = (index, value) => {
    setSteps((prev) => {
      const copy = [...prev]
      copy[index] = value
      return copy
    })
  }

  const addStep = () => setSteps((prev) => [...prev, ''])
  const removeStep = (index) => {
    if (steps.length <= 1) return
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim() || formData.name.trim().length < 3) {
      setError('Nama produk furniture minimal 3 karakter.')
      return
    }

    const cleanSpecs = specs
      .filter((s) => s.name.trim())
      .map((s) => ({
        name: s.name.trim(),
        quantity: s.quantity.trim() || 'Standar',
      }))

    const cleanSteps = steps.filter((s) => s.trim()).map((s) => s.trim())

    try {
      setCreating(true)

      // Jika pengguna memilih file gambar tetapi belum menekan tombol upload di Step 1, unggah otomatis sekarang
      let finalImageUrl = uploadedImageUrl
      if (imageFile) {
        const upRes = await uploadService.uploadImage(imageFile, 'furnitures', 'products')
        if (upRes.success && upRes.data?.url) {
          finalImageUrl = upRes.data.url
        }
      }
      if (!finalImageUrl || String(finalImageUrl).startsWith('blob:')) {
        finalImageUrl = '/furniture/chair.jpg'
      }

      const response = await furnitureService.createFurniture({
        name: formData.name.trim(),
        category: formData.type,
        type: formData.type,
        material: formData.caliber.trim(),
        caliber: formData.caliber.trim(),
        assembly_type: formData.difficulty,
        difficulty: formData.difficulty,
        price: Number(formData.price) || 1500000,
        description: formData.description.trim(),
        is_featured: Boolean(formData.is_featured),
        image_url: finalImageUrl,
        specs: cleanSpecs,
        ingredients: cleanSpecs,
        steps: cleanSteps,
      })

      if (response.success) {
        deleteDraft('create')
        if (onSuccess) onSuccess(response.data)
        else if (onBack) onBack()
      }
    } catch (err) {
      setError(err.message || 'Gagal menyimpan produk furniture ke database.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="form-page">
      <div className="form-head">
        <button type="button" className="detail-back" onClick={onBack}>
          <ArrowLeft size={18} /> Kembali ke Katalog
        </button>
        {currentStep === 'form' && (
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={() => handleSaveDraft(true)}
          >
            <Save size={14} /> Simpan Draft Offline
          </button>
        )}
      </div>

      <div className="form-title-group">
        <h1 className="display">Tambah Koleksi Furniture Baru (Create CRUD)</h1>
        <p className="lede">
          Produk baru akan langsung disimpan ke tabel <code>public.furnitures</code> dan foto diunggah ke Storage Bucket <code>furnitures</code> di Supabase.
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

      <div className="form-steps-nav">
        <button
          type="button"
          onClick={() => setCurrentStep('upload')}
          className={`step-badge ${currentStep === 'upload' ? 'step-badge--active' : 'step-badge--done'}`}
          style={{ cursor: 'pointer' }}
        >
          1. Foto Produk Furniture
        </button>
        <div className="step-badge-connector" />
        <button
          type="button"
          onClick={() => setCurrentStep('form')}
          className={`step-badge ${currentStep === 'form' ? 'step-badge--active' : ''}`}
          style={{ cursor: 'pointer' }}
        >
          2. Spesifikasi &amp; Detail Harga
        </button>
      </div>

      {currentStep === 'upload' && (
        <div className="card-box">
          <h2 className="card-box-title">Unggah Foto ke Supabase Storage Bucket</h2>
          <p className="card-box-desc">
            Unggah foto produk (JPG/PNG/WebP maks. 5MB) ke bucket <code>furnitures</code> atau pilih preset foto studio di bawah ini.
          </p>

          <div className="upload-dropzone" style={{ marginBottom: 18 }}>
            <input
              id="furniture-image-input"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleImageChange}
              className="hidden-file-input"
            />
            <label htmlFor="furniture-image-input" className="upload-label">
              <Upload size={36} className="upload-icon" />
              <span className="upload-main-text">Klik untuk memilih file foto dari perangkat</span>
              <span className="upload-sub-text">Akan diunggah otomatis ke Supabase Storage Bucket (furnitures)</span>
            </label>

            <div className="preset-selector">
              <span className="preset-title">Atau klik salah satu preset studio Kayu &amp; Ruang:</span>
              <div className="preset-pills">
                {PRESET_IMAGES.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    className={`pill ${imagePreview === preset.url ? 'pill--active' : ''}`}
                    onClick={() => handleSelectPreset(preset.url)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {imagePreview && (
            <div className="preview-container">
              <div className="preview-image-wrap">
                <img src={imagePreview} alt="Preview Furniture" className="preview-img" />
              </div>
              <div className="preview-actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleUploadImage}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader size={18} className="spin" /> Mengunggah ke Supabase Storage…
                    </>
                  ) : (
                    <>
                      <Upload size={18} /> Gunakan Foto Ini &amp; Lanjut ke Form Detail
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {currentStep === 'form' && (
        <form onSubmit={handleSubmit} className="entry-form">
          <div className="selected-thumb-bar">
            <img
              src={uploadedImageUrl || imagePreview || '/furniture/chair.jpg'}
              alt="Selected"
              className="thumb-small"
            />
            <div className="thumb-info">
              <span className="thumb-title">Foto Produk Terpilih</span>
              <span className="thumb-sub">
                {imageFile ? `File siap diunggah: ${imageFile.name}` : 'Siap disimpan ke tabel public.furnitures'}
              </span>
            </div>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => setCurrentStep('upload')}
            >
              Ganti Foto
            </button>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">
                Nama Produk Furniture <span className="req">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                placeholder="Contoh: Kursi Makan Jati Minimalis"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Kategori Ruang / Jenis <span className="req">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleFormChange}
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
              <label className="form-label">
                Material Utama <span className="req">*</span>
              </label>
              <input
                type="text"
                name="caliber"
                value={formData.caliber}
                onChange={handleFormChange}
                placeholder="Contoh: Kayu Jati Solid & Rotan"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Harga (IDR) <span className="req">*</span>
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleFormChange}
                min="50000"
                step="50000"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tingkat Perakitan</label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleFormChange}
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
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              placeholder="Jelaskan karakter serat kayu, kenyamanan, dan kecocokan ruang..."
              rows={3}
              className="form-textarea"
            />
          </div>

          <div className="form-fieldset">
            <div className="fieldset-header">
              <label className="form-label">Spesifikasi Dimensi &amp; Material</label>
              <button type="button" className="btn btn--outline btn--sm" onClick={addSpec}>
                <Plus size={14} /> Tambah Spesifikasi
              </button>
            </div>
            <div className="multi-rows">
              {specs.map((spec, i) => (
                <div key={i} className="multi-row">
                  <input
                    type="text"
                    placeholder="Atribut (mis. Dimensi)"
                    value={spec.name}
                    onChange={(e) => handleSpecChange(i, 'name', e.target.value)}
                    className="form-input"
                  />
                  <input
                    type="text"
                    placeholder="Nilai (mis. 120 x 60 x 75 cm)"
                    value={spec.quantity}
                    onChange={(e) => handleSpecChange(i, 'quantity', e.target.value)}
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="btn btn--danger-ghost"
                    onClick={() => removeSpec(i)}
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
              <button type="button" className="btn btn--outline btn--sm" onClick={addStep}>
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
                    onChange={(e) => handleStepChange(i, e.target.value)}
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="btn btn--danger-ghost"
                    onClick={() => removeStep(i)}
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
            <button type="submit" className="btn btn--primary" disabled={creating}>
              {creating ? 'Menyimpan ke Database…' : 'Simpan Produk ke Database'}
            </button>
          </div>
        </form>
      )}

      <ConfirmModal
        open={showDraftModal}
        title="Pulihkan Draft Sebelumnya?"
        message={`Ditemukan draft belum selesai dari ${draftTimestamp ? formatDraftTime(draftTimestamp) : 'sebelumnya'}. Ingin melanjutkan pengisian?`}
        confirmLabel="Pulihkan Draft"
        cancelLabel="Hapus Draft"
        onConfirm={handleLoadDraft}
        onCancel={handleDiscardDraft}
      />
    </div>
  )
}
