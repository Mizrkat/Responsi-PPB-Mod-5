import { apiClient, isSupabaseConfigured } from '../config/api'
import FURNITURES_LOCAL from '../data/furnitures'

const LOCAL_CATALOG_KEY = 'kayu_ruang_catalog_items_v1'

const ASSEMBLY_LABELS = {
  mudah: 'Siap Pakai (Fully Assembled)',
  sedang: 'Knockdown Mudah (15 Menit)',
  sulit: 'Custom / Instalasi Tim',
}

const formatAssemblyType = (val) => ASSEMBLY_LABELS[val] || val || 'Siap Pakai (Fully Assembled)'

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
// Normalizer — menyamakan struktur data dari tabel `public.furnitures` atau `public.products`
// ---------------------------------------------------------------------------
export const normalizeFurniture = (item) => {
  if (!item) return null

  let specsList = []
  if (Array.isArray(item.specs)) {
    specsList = item.specs.map((s, idx) => {
      if (typeof s === 'object' && s !== null) {
        return {
          id: s.id || `spec-${idx}`,
          name: s.name || 'Spesifikasi',
          quantity: s.quantity || '-',
        }
      }
      if (typeof s === 'string') {
        const colonIdx = s.indexOf(':')
        if (colonIdx > -1) {
          return {
            id: `spec-${idx}`,
            name: s.substring(0, colonIdx).trim(),
            quantity: s.substring(colonIdx + 1).trim(),
          }
        }
        return { id: `spec-${idx}`, name: 'Spesifikasi', quantity: s.trim() }
      }
      return { id: `spec-${idx}`, name: 'Spesifikasi', quantity: String(s) }
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

  const category = item.category || item.type || 'Kursi'
  const material = item.material || item.caliber || 'Kayu Jati Solid'
  const assemblyType = formatAssemblyType(item.assembly_type || item.difficulty)

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
// FurnitureService — Operasi CRUD Penuh ke Database Supabase (`public.furnitures`)
// ---------------------------------------------------------------------------
class FurnitureService {
  /**
   * Helper internal untuk INSERT 1 item ke Supabase `public.furnitures`
   * dengan fallback skema otomatis jika tipe kolom berbeda.
   */
  async _insertToSupabase(data) {
    const specsList = Array.isArray(data.specs)
      ? data.specs.map((i) => ({ name: i.name || 'Spesifikasi', quantity: i.quantity || '-' }))
      : Array.isArray(data.ingredients)
      ? data.ingredients.map((i) => ({ name: i.name || 'Spesifikasi', quantity: i.quantity || '-' }))
      : []

    const stepsList = Array.isArray(data.steps)
      ? data.steps.map((st) => (typeof st === 'string' ? st : st.instruction || '')).filter(Boolean)
      : []

    const category = data.category || data.type || 'Kursi'
    const material = data.material || data.caliber || 'Kayu Jati Solid'
    const assemblyType = formatAssemblyType(data.assembly_type || data.difficulty)
    const cleanImageUrl =
      data.image_url && !String(data.image_url).startsWith('blob:')
        ? data.image_url
        : '/furniture/chair.jpg'

    const fullPayload = {
      name: (data.name || '').trim() || 'Produk Furniture Baru',
      category,
      material,
      assembly_type: assemblyType,
      price: Number(data.price ?? 0),
      description: (data.description || '').trim(),
      specs: specsList,
      steps: stepsList,
      image_url: cleanImageUrl,
      is_featured: Boolean(data.is_featured),
    }

    try {
      // 1. Coba INSERT ke tabel utama public.furnitures (skema JSONB specs)
      const res = await apiClient.post('/rest/v1/furnitures', fullPayload, {
        headers: { Prefer: 'return=representation' },
      })
      return normalizeFurniture(Array.isArray(res) ? res[0] : res)
    } catch (err1) {
      // 2. Fallback jika kolom specs bertipe TEXT[] atau kolom opsional tidak ada
      try {
        const minimalPayload = {
          name: fullPayload.name,
          category: fullPayload.category,
          material: fullPayload.material,
          price: fullPayload.price,
          description: fullPayload.description,
          image_url: fullPayload.image_url,
        }
        const res2 = await apiClient.post('/rest/v1/furnitures', minimalPayload, {
          headers: { Prefer: 'return=representation' },
        })
        return normalizeFurniture({
          ...fullPayload,
          ...(Array.isArray(res2) ? res2[0] : res2),
        })
      } catch {
        // 3. Fallback jika tabel di Supabase bernama public.products
        const productsPayload = {
          name: fullPayload.name,
          type: fullPayload.category,
          caliber: fullPayload.material,
          price: fullPayload.price,
          description: fullPayload.description,
          specs: specsList.map((s) => `${s.name}: ${s.quantity}`),
          image_url: fullPayload.image_url,
        }
        const res3 = await apiClient.post('/rest/v1/products', productsPayload, {
          headers: { Prefer: 'return=representation' },
        })
        return normalizeFurniture(Array.isArray(res3) ? res3[0] : res3)
      }
    }
  }

  /**
   * READ: Mengambil seluruh produk dari tabel `public.furnitures` di Supabase.
   * Jika tabel masih kosong (0 baris), otomatis melakukan seed 6 produk awal ke Supabase.
   */
  async getFurnitures(params = {}) {
    if (isSupabaseConfigured() && navigator.onLine) {
      try {
        const queryParts = ['select=*']
        if (params.search) {
          queryParts.push(`name=ilike.*${encodeURIComponent(params.search)}*`)
        }
        if (params.category && params.category !== 'Semua' && params.category !== 'All') {
          queryParts.push(`category=eq.${encodeURIComponent(params.category)}`)
        }
        queryParts.push('order=created_at.desc')
        if (params.limit) {
          queryParts.push(`limit=${params.limit}`)
        }
        const queryString = queryParts.join('&')

        let data
        try {
          data = await apiClient.get(`/rest/v1/furnitures?${queryString}`)
        } catch {
          data = await apiClient.get(`/rest/v1/products?select=*&order=created_at.desc`)
        }

        let list = Array.isArray(data) ? data.map(normalizeFurniture) : []

        // Jika tabel di Supabase masih kosong dan tidak sedang memfilter, seed otomatis
        const isUnfiltered =
          !params.search && (!params.category || params.category === 'Semua' || params.category === 'All')
        if (list.length === 0 && isUnfiltered) {
          const seeded = []
          for (const seedItem of FURNITURES_LOCAL) {
            try {
              const created = await this._insertToSupabase(seedItem)
              if (created) seeded.push(created)
            } catch {
              /* ignore individual seed failure */
            }
          }
          if (seeded.length > 0) {
            list = seeded
          }
        }

        // Sinkronkan item lokal yang belum masuk ke Supabase (id diawali 'furn-' tapi bukan 6 seed awal)
        const localItems = readLocalCatalog()
        const unsyncedCustoms = localItems.filter(
          (loc) =>
            String(loc.id).startsWith('furn-') &&
            !FURNITURES_LOCAL.some((seed) => seed.id === loc.id) &&
            !list.some((rem) => rem.name.toLowerCase() === (loc.name || '').toLowerCase()),
        )
        for (const unsynced of unsyncedCustoms) {
          try {
            const syncedItem = await this._insertToSupabase(unsynced)
            if (syncedItem) list.unshift(syncedItem)
          } catch {
            list.unshift(normalizeFurniture(unsynced))
          }
        }

        if (list.length > 0) {
          writeLocalCatalog(list)
          return {
            success: true,
            data: list,
            source: 'supabase',
            pagination: {
              total: list.length,
              page: params.page || 1,
              limit: params.limit || 50,
            },
          }
        }
      } catch (err) {
        console.warn('[FurnitureService] Gagal membaca Supabase, beralih ke LocalStorage:', err.message)
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
   * READ SINGLE: Mengambil detail 1 produk berdasarkan ID dari Supabase
   */
  async getFurnitureById(id) {
    if (isSupabaseConfigured() && navigator.onLine && !String(id).startsWith('furn-')) {
      try {
        const data = await apiClient.get(`/rest/v1/furnitures?id=eq.${id}&select=*`)
        if (Array.isArray(data) && data.length > 0) {
          return { success: true, data: normalizeFurniture(data[0]) }
        }
      } catch {
        /* fallback */
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
   * CREATE: Menambahkan produk baru ke tabel `public.furnitures` di Supabase
   */
  async createFurniture(data) {
    if (isSupabaseConfigured() && navigator.onLine) {
      try {
        const created = await this._insertToSupabase(data)
        const current = readLocalCatalog()
        writeLocalCatalog([created, ...current.filter((i) => String(i.id) !== String(created.id))])
        return { success: true, source: 'supabase', data: created }
      } catch (err) {
        console.error('[FurnitureService] Error saat INSERT ke Supabase:', err)
        const fallbackItem = normalizeFurniture({
          ...data,
          id: `furn-${Date.now()}`,
          created_at: new Date().toISOString(),
        })
        const current = readLocalCatalog()
        writeLocalCatalog([fallbackItem, ...current])
        return {
          success: true,
          source: 'local',
          warning: err.message || 'Tersimpan di perangkat lokal (cek tabel/RLS Supabase Anda).',
          data: fallbackItem,
        }
      }
    }

    const localCreated = normalizeFurniture({
      ...data,
      id: `furn-${Date.now()}`,
      created_at: new Date().toISOString(),
    })
    const current = readLocalCatalog()
    writeLocalCatalog([localCreated, ...current])
    return {
      success: true,
      source: 'local',
      warning: 'Konfigurasi .env Supabase belum aktif. Produk disimpan di LocalStorage.',
      data: localCreated,
    }
  }

  /**
   * UPDATE: Memperbarui data produk pada tabel `public.furnitures` di Supabase
   */
  async updateFurniture(id, data) {
    const specsList = Array.isArray(data.specs)
      ? data.specs.map((i) => ({ name: i.name || 'Spesifikasi', quantity: i.quantity || '-' }))
      : Array.isArray(data.ingredients)
      ? data.ingredients.map((i) => ({ name: i.name || 'Spesifikasi', quantity: i.quantity || '-' }))
      : undefined

    const stepsList = Array.isArray(data.steps)
      ? data.steps.map((st) => (typeof st === 'string' ? st : st.instruction || '')).filter(Boolean)
      : undefined

    const payload = {
      updated_at: new Date().toISOString(),
    }
    if (data.name !== undefined) payload.name = data.name.trim()
    if (data.category !== undefined || data.type !== undefined) {
      payload.category = data.category || data.type
    }
    if (data.material !== undefined || data.caliber !== undefined) {
      payload.material = data.material || data.caliber
    }
    if (data.assembly_type !== undefined || data.difficulty !== undefined) {
      payload.assembly_type = formatAssemblyType(data.assembly_type || data.difficulty)
    }
    if (data.price !== undefined) payload.price = Number(data.price ?? 0)
    if (data.description !== undefined) payload.description = data.description.trim()
    if (specsList !== undefined) payload.specs = specsList
    if (stepsList !== undefined) payload.steps = stepsList
    if (data.image_url !== undefined && !String(data.image_url).startsWith('blob:')) {
      payload.image_url = data.image_url
    }
    if (data.is_featured !== undefined) payload.is_featured = Boolean(data.is_featured)

    if (isSupabaseConfigured() && navigator.onLine) {
      try {
        let targetDbId = !String(id).startsWith('furn-') ? id : null

        // Jika item sebelumnya memiliki ID lokal 'furn-...', cari barisnya di Supabase berdasarkan nama atau buat baru
        if (!targetDbId && payload.name) {
          const existing = await apiClient.get(
            `/rest/v1/furnitures?name=ilike.${encodeURIComponent(payload.name)}&select=id&limit=1`,
          )
          if (Array.isArray(existing) && existing.length > 0) {
            targetDbId = existing[0].id
          }
        }

        let updated
        if (targetDbId) {
          try {
            const res = await apiClient.patch(`/rest/v1/furnitures?id=eq.${targetDbId}`, payload, {
              headers: { Prefer: 'return=representation' },
            })
            const row = Array.isArray(res) ? res[0] : res
            updated = normalizeFurniture(row || { ...data, ...payload, id: targetDbId })
          } catch {
            // Fallback ke tabel public.products jika pengguna memakai skema lama
            const prodPayload = {
              name: payload.name,
              type: payload.category,
              caliber: payload.material,
              price: payload.price,
              description: payload.description,
              image_url: payload.image_url,
              updated_at: payload.updated_at,
            }
            const res2 = await apiClient.patch(`/rest/v1/products?id=eq.${targetDbId}`, prodPayload, {
              headers: { Prefer: 'return=representation' },
            })
            const row2 = Array.isArray(res2) ? res2[0] : res2
            updated = normalizeFurniture(row2 || { ...data, ...payload, id: targetDbId })
          }
        } else {
          // Jika belum ada di Supabase sama sekali, INSERT sebagai baris baru di Supabase
          updated = await this._insertToSupabase({ ...data, ...payload })
        }

        const current = readLocalCatalog()
        const idx = current.findIndex((item) => String(item.id) === String(id) || String(item.id) === String(updated.id))
        if (idx > -1) {
          current[idx] = updated
        } else {
          current.unshift(updated)
        }
        writeLocalCatalog(current)
        return { success: true, source: 'supabase', data: updated }
      } catch (err) {
        console.warn('[FurnitureService] Gagal PATCH ke Supabase:', err.message)
      }
    }

    const current = readLocalCatalog()
    const idx = current.findIndex((item) => String(item.id) === String(id))
    const updatedItem = normalizeFurniture({
      ...(idx > -1 ? current[idx] : {}),
      ...data,
      ...payload,
      id,
    })
    if (idx > -1) {
      current[idx] = updatedItem
    } else {
      current.unshift(updatedItem)
    }
    writeLocalCatalog(current)
    return { success: true, source: 'local', data: updatedItem }
  }

  /**
   * DELETE: Menghapus produk dari tabel `public.furnitures` di Supabase
   */
  async deleteFurniture(id, itemName = '') {
    if (isSupabaseConfigured() && navigator.onLine) {
      try {
        if (!String(id).startsWith('furn-')) {
          try {
            await apiClient.delete(`/rest/v1/furnitures?id=eq.${id}`)
          } catch {
            await apiClient.delete(`/rest/v1/products?id=eq.${id}`)
          }
        } else if (itemName) {
          await apiClient.delete(`/rest/v1/furnitures?name=eq.${encodeURIComponent(itemName)}`)
        }
      } catch (err) {
        console.warn('[FurnitureService] Gagal DELETE di Supabase:', err.message)
      }
    }
    const current = readLocalCatalog()
    writeLocalCatalog(
      current.filter(
        (item) =>
          String(item.id) !== String(id) &&
          (!itemName || item.name !== itemName),
      ),
    )
    return { success: true }
  }
}

export default new FurnitureService()
