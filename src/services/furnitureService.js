import { apiClient, IS_SUPABASE } from '../config/api'
import FURNITURES_LOCAL from '../data/furnitures'

const LOCAL_CATALOG_KEY = 'kayu_ruang_catalog_items_v1'

// ---------------------------------------------------------------------------
// LocalStorage Catalog Helper — menjamin operasi CRUD (Create, Read, Update,
// Delete) tetap persisten secara offline maupun ketika RLS server membatasi tulis.
// ---------------------------------------------------------------------------
export const readLocalCatalog = () => {
  try {
    const raw = localStorage.getItem(LOCAL_CATALOG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
    localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(FURNITURES_LOCAL))
    return [...FURNITURES_LOCAL]
  } catch {
    return [...FURNITURES_LOCAL]
  }
}

export const writeLocalCatalog = (items) => {
  try {
    localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(items))
  } catch {
    /* ignore quota errors */
  }
}

export const resetLocalCatalog = () => {
  try {
    localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(FURNITURES_LOCAL))
    return [...FURNITURES_LOCAL]
  } catch {
    return [...FURNITURES_LOCAL]
  }
}

// ---------------------------------------------------------------------------
// Normalizer — menyamakan struktur data produk dari Supabase (/rest/v1/products),
// REST API (/api/v1/recipes), maupun LocalStorage.
// ---------------------------------------------------------------------------
export const normalizeProduct = (item) => {
  if (!item) return null

  let specsList = []
  if (Array.isArray(item.specs)) {
    specsList = item.specs.map((s, idx) => {
      if (typeof s === 'string') {
        const colonIndex = s.indexOf(':')
        if (colonIndex > -1) {
          return {
            id: `spec-${idx}`,
            name: s.substring(0, colonIndex).trim(),
            quantity: s.substring(colonIndex + 1).trim(),
          }
        }
        return {
          id: `spec-${idx}`,
          name: 'Spesifikasi',
          quantity: s.trim(),
        }
      }
      return s
    })
  } else if (Array.isArray(item.ingredients)) {
    specsList = item.ingredients
  }

  const stepsList =
    Array.isArray(item.steps) && item.steps.length > 0
      ? item.steps.map((st) => (typeof st === 'string' ? st : st.instruction || ''))
      : [
          'Periksa kelengkapan komponen dan baut sebelum memulai perakitan.',
          'Bersihkan permukaan kayu secara berkala menggunakan kain microfiber kering.',
        ]

  return {
    ...item,
    id: item.id,
    name: item.name || 'Produk Furniture',
    type: item.type || item.category || 'Kursi',
    category: item.type || item.category || 'Kursi',
    caliber: item.caliber || 'Kayu Jati Solid',
    price: Number(item.price ?? item.cook_time ?? 0),
    description: item.description || '',
    image_url: item.image_url || item.image || '/furniture/chair.jpg',
    image: item.image_url || item.image || '/furniture/chair.jpg',
    ingredients: specsList,
    steps: stepsList,
  }
}

// ---------------------------------------------------------------------------
// FurnitureService — membungkus endpoint CRUD (Create, Read, Update, Delete).
// ---------------------------------------------------------------------------
class FurnitureService {
  /**
   * Mengambil daftar produk furniture (mendukung Supabase + LocalStorage).
   */
  async getFurnitures(params = {}) {
    const localItems = readLocalCatalog().map(normalizeProduct)

    if (IS_SUPABASE) {
      try {
        const queryParts = ['select=*']
        if (params.search) {
          queryParts.push(`name=ilike.*${encodeURIComponent(params.search)}*`)
        }
        if (params.category && params.category !== 'Semua' && params.category !== 'All') {
          queryParts.push(`type=eq.${encodeURIComponent(params.category)}`)
        }
        queryParts.push('order=created_at.desc')
        if (params.limit) {
          queryParts.push(`limit=${params.limit}`)
        }
        const queryString = queryParts.join('&')
        const data = await apiClient.get(`/rest/v1/products?${queryString}`)
        const remoteList = Array.isArray(data) ? data.map(normalizeProduct) : []

        // Gabungkan item lokal kustom tema furniture dengan item yang dibuat user
        const mergedMap = new Map()
        localItems.forEach((item) => mergedMap.set(String(item.id), item))
        remoteList.forEach((item) => {
          // Hanya masukkan item dari server jika bertema furniture atau dibuat oleh user
          if (item && item.id && String(item.id).startsWith('furn-')) {
            mergedMap.set(String(item.id), item)
          }
        })
        const finalList = Array.from(mergedMap.values())
        return {
          success: true,
          data: finalList,
          source: 'hybrid',
          pagination: {
            total: finalList.length,
            page: params.page || 1,
            limit: params.limit || 50,
          },
        }
      } catch {
        // Fallback otomatis ke LocalStorage saat offline
        return {
          success: true,
          data: localItems,
          source: 'local',
          pagination: {
            total: localItems.length,
            page: 1,
            limit: 50,
          },
        }
      }
    }

    return {
      success: true,
      data: localItems,
      source: 'local',
      pagination: {
        total: localItems.length,
        page: 1,
        limit: 50,
      },
    }
  }

  /**
   * Mengambil detail satu produk furniture berdasarkan ID.
   */
  async getFurnitureById(id) {
    const localItems = readLocalCatalog()
    const foundLocal = localItems.find((item) => String(item.id) === String(id))
    if (foundLocal) {
      return { success: true, data: normalizeProduct(foundLocal) }
    }

    if (IS_SUPABASE) {
      const data = await apiClient.get(`/rest/v1/products?id=eq.${id}&select=*`)
      if (Array.isArray(data) && data.length > 0) {
        return { success: true, data: normalizeProduct(data[0]) }
      }
    }
    throw new Error('Produk furniture tidak ditemukan.')
  }

  /**
   * Membuat produk furniture baru (Create).
   */
  async createFurniture(data) {
    const specsArray = Array.isArray(data.ingredients)
      ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`)
      : Array.isArray(data.specs)
      ? data.specs
      : []

    const newItem = normalizeProduct({
      id: `furn-${Date.now()}`,
      name: data.name,
      type: data.type || data.category || 'Kursi',
      category: data.type || data.category || 'Kursi',
      caliber: data.caliber || 'Kayu Jati Solid',
      difficulty: data.difficulty || 'sedang',
      price: Number(data.price ?? data.cook_time ?? 0),
      description: data.description || '',
      image_url: data.image_url || '/furniture/chair.jpg',
      is_featured: Boolean(data.is_featured),
      ingredients: data.ingredients || [],
      steps: data.steps || [],
      created_at: new Date().toISOString(),
    })

    // Simpan ke LocalStorage agar offline-first selalu terjamin
    const current = readLocalCatalog()
    writeLocalCatalog([newItem, ...current])

    if (IS_SUPABASE && navigator.onLine) {
      try {
        const payload = {
          name: newItem.name,
          type: newItem.type,
          caliber: newItem.caliber,
          price: newItem.price,
          description: newItem.description,
          specs: specsArray,
          image_url: newItem.image_url,
        }
        await apiClient.post('/rest/v1/products', payload, {
          headers: { Prefer: 'return=representation' },
        })
      } catch {
        // Tetap sukses karena sudah tersimpan di LocalStorage
      }
    }

    return { success: true, data: newItem }
  }

  /**
   * Memperbarui produk furniture yang ada (Update).
   */
  async updateFurniture(id, data) {
    const current = readLocalCatalog()
    const idx = current.findIndex((item) => String(item.id) === String(id))

    const updatedItem = normalizeProduct({
      ...(idx > -1 ? current[idx] : {}),
      ...data,
      id,
      type: data.type || data.category || 'Kursi',
      category: data.type || data.category || 'Kursi',
      price: Number(data.price ?? data.cook_time ?? 0),
      updated_at: new Date().toISOString(),
    })

    if (idx > -1) {
      current[idx] = updatedItem
    } else {
      current.unshift(updatedItem)
    }
    writeLocalCatalog(current)

    if (IS_SUPABASE && navigator.onLine && !String(id).startsWith('furn-')) {
      try {
        const specsArray = Array.isArray(data.ingredients)
          ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`)
          : undefined
        const payload = {
          name: updatedItem.name,
          type: updatedItem.type,
          caliber: updatedItem.caliber,
          price: updatedItem.price,
          description: updatedItem.description,
          specs: specsArray,
          image_url: updatedItem.image_url,
          updated_at: updatedItem.updated_at,
        }
        await apiClient.patch(`/rest/v1/products?id=eq.${id}`, payload, {
          headers: { Prefer: 'return=representation' },
        })
      } catch {
        // Ignore remote error since local update succeeded
      }
    }

    return { success: true, data: updatedItem }
  }

  /**
   * Menghapus produk furniture (Delete).
   */
  async deleteFurniture(id) {
    const current = readLocalCatalog()
    const filtered = current.filter((item) => String(item.id) !== String(id))
    writeLocalCatalog(filtered)

    if (IS_SUPABASE && navigator.onLine && !String(id).startsWith('furn-')) {
      try {
        await apiClient.delete(`/rest/v1/products?id=eq.${id}`)
      } catch {
        // Ignore remote error
      }
    }

    return { success: true }
  }
}

export default new FurnitureService()
