import axios from 'axios'
import { getSupabaseConfig, isSupabaseConfigured } from '../config/api'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

/**
 * Kompresi gambar menggunakan HTML5 Canvas agar ukuran file ringan (<80 KB),
 * mempercepat upload ke Supabase Storage Bucket dan mencegah error payload terlalu besar.
 */
const compressImageFile = (file, maxWidth = 900, maxHeight = 675, quality = 0.82) =>
  new Promise((resolve) => {
    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          let { width, height } = img
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height)
            width = Math.round(width * ratio)
            height = Math.round(height * ratio)
          }
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          const dataUrl = canvas.toDataURL('image/jpeg', quality)
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File(
                  [blob],
                  file.name.replace(/\.[^.]+$/, '.jpg'),
                  { type: 'image/jpeg' },
                )
                resolve({ file: compressedFile, dataUrl })
              } else {
                resolve({ file, dataUrl })
              }
            },
            'image/jpeg',
            quality,
          )
        }
        img.onerror = () => resolve({ file, dataUrl: e.target.result })
        img.src = e.target.result
      }
      reader.onerror = () => resolve({ file, dataUrl: null })
      reader.readAsDataURL(file)
    } catch {
      resolve({ file, dataUrl: null })
    }
  })

class UploadService {
  /**
   * Mengunggah file gambar ke Supabase Storage Bucket (`furnitures` atau `avatars`).
   */
  async uploadImage(file, bucketName = 'furnitures', folder = 'products') {
    if (!file) {
      throw new Error('Pilih file gambar terlebih dahulu.')
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Format file tidak didukung. Gunakan .jpg, .jpeg, .png, atau .webp')
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error('Ukuran gambar melebihi batas maksimum 5 MB.')
    }

    const { file: uploadBlob, dataUrl } = await compressImageFile(file)

    if (isSupabaseConfigured() && navigator.onLine) {
      const { baseUrl, supabaseKey } = getSupabaseConfig()
      const cleanExt = (uploadBlob.name.split('.').pop() || 'jpg').toLowerCase()
      const fileName = `${folder}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${cleanExt}`
      const objectPath = folder ? `${folder}/${fileName}` : fileName

      // Coba unggah ke bucket utama, lalu fallback ke bucket 'furnitures' jika bucket 'avatars' belum ada
      const candidateBuckets =
        bucketName === 'avatars' ? ['avatars', 'furnitures'] : [bucketName]

      for (const bucket of candidateBuckets) {
        try {
          const uploadUrl = `${baseUrl}/storage/v1/object/${bucket}/${objectPath}`
          await axios.post(uploadUrl, uploadBlob, {
            headers: {
              'Content-Type': uploadBlob.type || 'image/jpeg',
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              'x-upsert': 'true',
            },
            timeout: 20000,
          })
          const publicUrl = `${baseUrl}/storage/v1/object/public/${bucket}/${objectPath}`
          return {
            success: true,
            source: 'supabase_storage',
            data: {
              url: publicUrl,
              bucket,
              path: objectPath,
              filename: fileName,
            },
          }
        } catch (err) {
          console.warn(`[UploadService] Bucket "${bucket}" gagal:`, err.message)
        }
      }
    }

    return {
      success: true,
      source: 'local_base64',
      data: {
        url: dataUrl || '/furniture/chair.jpg',
        bucket: 'local',
        path: file.name,
        filename: file.name,
      },
    }
  }


  /**
   * Mengunggah gambar berformat Base64 Data URL (yang disimpan saat HP sedang offline)
   * ke Supabase Storage Bucket saat kembali online.
   */
  async uploadDataUrlToSupabase(dataUrl, bucketName = 'furnitures', folder = 'products') {
    if (!dataUrl || !String(dataUrl).startsWith('data:image/')) {
      return { success: false, url: dataUrl }
    }
    if (!isSupabaseConfigured() || !navigator.onLine) {
      return { success: false, url: dataUrl }
    }
    try {
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
      const file = new File([blob], `offline_${Date.now()}.${ext}`, {
        type: blob.type || 'image/jpeg',
      })
      const uploaded = await this.uploadImage(file, bucketName, folder)
      if (uploaded.success && uploaded.source === 'supabase_storage' && uploaded.data?.url) {
        return { success: true, url: uploaded.data.url }
      }
    } catch (err) {
      console.warn('[UploadService] Gagal sync gambar Base64 ke Storage:', err.message)
    }
    return { success: false, url: dataUrl }
  }

  /**
   * Mengambil daftar file yang tersimpan di dalam Supabase Storage Bucket
   */
  async listFiles(bucketName = 'furnitures', folder = 'products') {
    if (!isSupabaseConfigured() || !navigator.onLine) {
      return { success: true, data: [] }
    }
    const { baseUrl, supabaseKey } = getSupabaseConfig()
    try {
      const response = await axios.post(
        `${baseUrl}/storage/v1/object/list/${bucketName}`,
        {
          prefix: folder ? `${folder}/` : '',
          limit: 50,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        },
      )
      const files = Array.isArray(response.data)
        ? response.data
            .filter((f) => f.name && f.name !== '.emptyFolderPlaceholder')
            .map((f) => ({
              ...f,
              publicUrl: `${baseUrl}/storage/v1/object/public/${bucketName}/${folder ? `${folder}/` : ''}${f.name}`,
            }))
        : []
      return { success: true, data: files }
    } catch {
      return { success: false, data: [] }
    }
  }
}

export default new UploadService()
