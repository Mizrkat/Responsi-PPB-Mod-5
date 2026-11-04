import axios from 'axios'
import { BASE_URL, SUPABASE_KEY, IS_SUPABASE } from '../config/api'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

class UploadService {
  /**
   * Mengunggah file gambar ke Supabase Storage Bucket (`furnitures` atau `avatars`).
   * Menyimpan file langsung di Storage Bucket Supabase dan mengembalikan public URL-nya.
   *
   * @param {File} file - File gambar yang dipilih pengguna
   * @param {string} [bucketName='furnitures'] - Nama bucket di Supabase Storage ('furnitures' atau 'avatars')
   * @param {string} [folder='products'] - Subfolder di dalam bucket ('products' atau 'profiles')
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

    if (IS_SUPABASE && navigator.onLine) {
      const cleanExt = (file.name.split('.').pop() || 'png').toLowerCase()
      const fileName = `${folder}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${cleanExt}`
      const objectPath = folder ? `${folder}/${fileName}` : fileName

      try {
        const uploadUrl = `${BASE_URL}/storage/v1/object/${bucketName}/${objectPath}`
        await axios.post(uploadUrl, file, {
          headers: {
            'Content-Type': file.type,
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'x-upsert': 'true',
          },
          timeout: 25000,
        })
        const publicUrl = `${BASE_URL}/storage/v1/object/public/${bucketName}/${objectPath}`
        return {
          success: true,
          source: 'supabase_storage',
          data: {
            url: publicUrl,
            bucket: bucketName,
            path: objectPath,
            filename: fileName,
          },
        }
      } catch (err) {
        console.warn(
          `[UploadService] Upload ke Supabase Storage bucket "${bucketName}" gagal, beralih ke fallback Base64:`,
          err,
        )
      }
    }

    // Fallback Base64 jika sedang offline atau bucket belum diinisialisasi
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    return {
      success: true,
      source: 'local_base64',
      data: {
        url: dataUrl,
        bucket: 'local',
        path: file.name,
        filename: file.name,
      },
    }
  }

  /**
   * Mengambil daftar file yang tersimpan di dalam Supabase Storage Bucket
   */
  async listFiles(bucketName = 'furnitures', folder = 'products') {
    if (!IS_SUPABASE || !navigator.onLine) {
      return { success: true, data: [] }
    }
    try {
      const response = await axios.post(
        `${BASE_URL}/storage/v1/object/list/${bucketName}`,
        {
          prefix: folder ? `${folder}/` : '',
          limit: 50,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        },
      )
      const files = Array.isArray(response.data)
        ? response.data
            .filter((f) => f.name && f.name !== '.emptyFolderPlaceholder')
            .map((f) => ({
              ...f,
              publicUrl: `${BASE_URL}/storage/v1/object/public/${bucketName}/${folder ? `${folder}/` : ''}${f.name}`,
            }))
        : []
      return { success: true, data: files }
    } catch {
      return { success: false, data: [] }
    }
  }
}

export default new UploadService()
