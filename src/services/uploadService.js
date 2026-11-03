import axios from 'axios'
import { BASE_URL, SUPABASE_KEY, IS_SUPABASE } from '../config/api'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

class UploadService {
  async uploadImage(file) {
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
      const ext = file.name.split('.').pop() || 'png'
      const fileName = `furniture_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`
      const bucketName = 'guns'

      try {
        const uploadUrl = `${BASE_URL}/storage/v1/object/${bucketName}/${fileName}`
        await axios.post(uploadUrl, file, {
          headers: {
            'Content-Type': file.type,
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          timeout: 15000,
        })
        const publicUrl = `${BASE_URL}/storage/v1/object/public/${bucketName}/${fileName}`
        return {
          success: true,
          data: { url: publicUrl, filename: fileName },
        }
      } catch {
        // Fallback ke Base64 Data URL agar gambar tetap tampil dan tersimpan di LocalStorage
      }
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    return {
      success: true,
      data: { url: dataUrl, filename: file.name },
    }
  }
}

export default new UploadService()
