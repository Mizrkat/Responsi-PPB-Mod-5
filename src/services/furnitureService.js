import { apiClient, IS_SUPABASE } from '../config/api'
import FURNITURES_LOCAL from '../data/furnitures'

const LOCAL_CATALOG_KEY = 'kayu_ruang_catalog_items_v1'

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
// Normalizer — menyamakan format data dari tabel Supabase `public.furnitures`
// ---------------------------------------------------------------------------
export const normalizeFurniture = (item) => {
  if (!item) return null

  const specsList = Array.isArray(item.specs)
    ? item.specs.map((s, idx) =>
        typeof s === 'object' && s !== null
          ? { id: s.id || `spec-${idx}`, name: s.name || 'Spesifikasi', quantity: s.quantity || '-' }
          : { id: `spec-${idx}`, name: 'Spesifikasi', quantity: String(s) },
      )
    : Array.isArray(item.ingredients)
    ? item.ingredients
    : []

  const stepsList =
    Array.isArray(item.steps) && item.steps.length > 0
      ? item.steps.map((st) => (typeof st === 'string' ? st : st.instruction || ''))
      : [
          'Periksa kelengkapan komponen dan baut sebelum memulai perakitan.',
          'Bersihkan permukaan kayu secara berkala menggunakan kain microfiber kering.',
        ]

  const category = item.category || item.type || 'Kursi'
  const material = item.material || item.caliber || 'Kayu Jati Solid'
  const assemblyType = item.assembly_type || item.difficulty || 'Siap Pakai (Fully Assembled)'

  return {
    ...item,
    id: item.id,
    name: item.name || 'Produk Furniture',
    category,
    type: category,
    material,
    caliber: material,
    assembly_type: assemblyType,
    difficulty: assemblyType,
    price: Number(item.price ?? 0),
    description: item.description || '',
    image_url: item.image_url || item.image || '/furniture/chair.jpg',
    image: item.image_url || item.image || '/furniture/chair.jpg',
    is_featured: Boolean(item.is_featured),
    specs: specsList,
    ingredients: specsList,
    steps: stepsList,
  }
}

// ---------------------------------------------------------------------------
// FurnitureService — CRUD ke endpoint PostgREST Supabase `/rest/v1/furnitures`
// dengan fallback otomatis ke LocalStorage saat offline.
// ---------------------------------------------------------------------------
class FurnitureService {
  /**
   * Mengambil seluruh produk dari tabel `public.furnitures`
   */
  async getFurnitures(params = {}) {
    if (IS_SUPABASE && navigator.onLine) {
      try {
        const queryParts = ['select=*']
        if (params.search) {
          queryParts.push(`name=ilike.*${encodeURIComponent(params.search)}*`)
        }
        if (params.category && params.category !== 'Semua' && params.category !== 'All') {
          queryParts.push(`category=eq.${encodeURIComponent(params.category)}`)
        }
        if (params.sort_by) {
          const order = params.order === 'desc' ? 'desc' : 'asc'
          queryParts.push(`order=${encodeURIComponent(params.sort_by)}.${order}`)
        } else {
          queryParts.push('order=created_at.desc')
        }
        if (params.limit) {
          queryParts.push(`limit=${params.limit}`)
        }
        const queryString = queryParts.join('&')
        const data = await apiClient.get(`/rest/v1/furnitures?${queryString}`)
        const list = Array.isArray(data) ? data.map(normalizeFurniture) : []
        if (list.length > 0) {
          writeLocalCatalog(list)
        }
        return {
          success: true,
          data: list.length > 0 ? list : readLocalCatalog().map(normalizeFurniture),
          source: 'supabase',
          pagination: {
            total: list.length,
            page: params.page || 1,
            limit: params.limit || 50,
          },
        }
      } catch (err) {
        console.warn('[FurnitureService] Fallback ke LocalStorage:', err.message)
      }
    }

    const localItems = readLocalCatalog().map(normalizeFurniture)
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
   * Mengambil detail 1 produk furniture dari `public.furnitures`
   */
  async getFurnitureById(id) {
    if (IS_SUPABASE && navigator.onLine && !String(id).startsWith('furn-')) {
      try {
        const data = await apiClient.get(`/rest/v1/furnitures?id=eq.${id}&select=*`)
        if (Array.isArray(data) && data.length > 0) {
          return { success: true, data: normalizeFurniture(data[0]) }
        }
      } catch {
        /* fallback ke local */
      }
    }
    const localItems = readLocalCatalog()
    const found = localItems.find((item) => String(item.id) === String(id))
    if (found) {
      return { success: true, data: normalizeFurniture(found) }
    }
    throw new Error('Produk furniture tidak ditemukan.')
  }

  /**
   * Menambahkan produk furniture baru (INSERT ke `public.furnitures`)
   */
  async createFurniture(data) {
    const specsList = Array.isArray(data.specs)
      ? data.specs
      : Array.isArray(data.ingredients)
      ? data.ingredients.map((i) => ({ name: i.name, quantity: i.quantity }))
      : []

    const stepsList = Array.isArray(data.steps) ? data.steps : []

    const payload = {
      name: data.name,
      category: data.category || data.type || 'Kursi',
      material: data.material || data.caliber || 'Kayu Jati Solid',
      assembly_type: data.assembly_type || data.difficulty || 'Siap Pakai (Fully Assembled)',
      price: Number(data.price ?? 0),
      description: data.description || '',
      specs: specsList,
      steps: stepsList,
      image_url: data.image_url || '/furniture/chair.jpg',
      is_featured: Boolean(data.is_featured),
    }

    if (IS_SUPABASE && navigator.onLine) {
      try {
        const res = await apiClient.post('/rest/v1/furnitures', payload, {
          headers: { Prefer: 'return=representation' },
        })
        const created = normalizeFurniture(Array.isArray(res) ? res[0] : res)
        const current = readLocalCatalog()
        writeLocalCatalog([created, ...current])
        return { success: true, data: created }
      } catch (err) {
        console.warn('[FurnitureService] Gagal POST ke Supabase, menyimpan ke LocalStorage:', err.message)
      }
    }

    const localCreated = normalizeFurniture({
      ...payload,
      id: `furn-${Date.now()}`,
      created_at: new Date().toISOString(),
    })
    const current = readLocalCatalog()
    writeLocalCatalog([localCreated, ...current])
    return { success: true, data: localCreated }
  }

  /**
   * Memperbarui data produk furniture (PATCH ke `public.furnitures`)
   */
  async updateFurniture(id, data) {
    const specsList = Array.isArray(data.specs)
      ? data.specs
      : Array.isArray(data.ingredients)
      ? data.ingredients.map((i) => ({ name: i.name, quantity: i.quantity }))
      : undefined

    const payload = {
      updated_at: new Date().toISOString(),
    }
    if (data.name !== undefined) payload.name = data.name
    if (data.category !== undefined || data.type !== undefined) {
      payload.category = data.category || data.type
    }
    if (data.material !== undefined || data.caliber !== undefined) {
      payload.material = data.material || data.caliber
    }
    if (data.assembly_type !== undefined || data.difficulty !== undefined) {
      payload.assembly_type = data.assembly_type || data.difficulty
    }
    if (data.price !== undefined) payload.price = Number(data.price)
    if (data.description !== undefined) payload.description = data.description
    if (specsList !== undefined) payload.specs = specsList
    if (data.steps !== undefined) payload.steps = data.steps
    if (data.image_url !== undefined) payload.image_url = data.image_url
    if (data.is_featured !== undefined) payload.is_featured = Boolean(data.is_featured)

    if (IS_SUPABASE && navigator.onLine && !String(id).startsWith('furn-')) {
      try {
        const res = await apiClient.patch(`/rest/v1/furnitures?id=eq.${id}`, payload, {
          headers: { Prefer: 'return=representation' },
        })
        const updated = normalizeFurniture(Array.isArray(res) ? res[0] : res)
        const current = readLocalCatalog()
        const idx = current.findIndex((item) => String(item.id) === String(id))
        if (idx > -1) {
          current[idx] = updated
          writeLocalCatalog(current)
        }
        return { success: true, data: updated }
      } catch (err) {
        console.warn('[FurnitureService] Gagal PATCH ke Supabase, update di LocalStorage:', err.message)
      }
    }

    const current = readLocalCatalog()
    const idx = current.findIndex((item) => String(item.id) === String(id))
    const updatedItem = normalizeFurniture({
      ...(idx > -1 ? current[idx] : {}),
      ...payload,
      id,
    })
    if (idx > -1) {
      current[idx] = updatedItem
    } else {
      current.unshift(updatedItem)
    }
    writeLocalCatalog(current)
    return { success: true, data: updatedItem }
  }

  /**
   * Menghapus produk furniture (DELETE dari `public.furnitures`)
   */
  async deleteFurniture(id) {
    if (IS_SUPABASE && navigator.onLine && !String(id).startsWith('furn-')) {
      try {
        await apiClient.delete(`/rest/v1/furnitures?id=eq.${id}`)
      } catch (err) {
        console.warn('[FurnitureService] Gagal DELETE di Supabase:', err.message)
      }
    }
    const current = readLocalCatalog()
    writeLocalCatalog(current.filter((item) => String(item.id) !== String(id)))
    return { success: true }
  }
}

export default new FurnitureService()
