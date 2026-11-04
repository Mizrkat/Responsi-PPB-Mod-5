import { apiClient, isSupabaseConfigured } from '../config/api'
import FURNITURES_LOCAL from '../data/furnitures'

const LOCAL_CATALOG_KEY = 'kayu_ruang_catalog_items_v1'
const SOFT_DELETED_FURN_KEY = 'kayu_ruang_soft_deleted_furnitures_v1'
const SOFT_DELETED_ARCHIVE_KEY = 'kayu_ruang_soft_deleted_archive_v1'

const ASSEMBLY_LABELS = {
  mudah: 'Siap Pakai (Fully Assembled)',
  sedang: 'Knockdown Mudah (15 Menit)',
  sulit: 'Custom / Instalasi Tim',
}

const formatAssemblyType = (val) => ASSEMBLY_LABELS[val] || val || 'Siap Pakai (Fully Assembled)'

export const readSoftDeletedIds = () => {
  try {
    const raw = localStorage.getItem(SOFT_DELETED_FURN_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

export const readSoftDeletedArchive = () => {
  try {
    const raw = localStorage.getItem(SOFT_DELETED_ARCHIVE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const writeSoftDeletedArchive = (items) => {
  try {
    localStorage.setItem(SOFT_DELETED_ARCHIVE_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
}

export const addSoftDeletedRecord = (itemOrId, name = '') => {
  try {
    const id = typeof itemOrId === 'object' && itemOrId !== null ? itemOrId.id : itemOrId
    const itemName = (typeof itemOrId === 'object' && itemOrId !== null ? itemOrId.name : name) || ''
    const current = readSoftDeletedIds()
    const next = new Set(current)
    if (id !== undefined && id !== null) next.add(String(id))
    if (itemName) next.add(`name:${itemName.toLowerCase()}`)
    localStorage.setItem(SOFT_DELETED_FURN_KEY, JSON.stringify(Array.from(next)))

    if (typeof itemOrId === 'object' && itemOrId !== null) {
      const archive = readSoftDeletedArchive()
      const filtered = archive.filter((a) => String(a.id) !== String(itemOrId.id))
      writeSoftDeletedArchive([
        {
          ...itemOrId,
          original_category:
            itemOrId.category && !String(itemOrId.category).startsWith('[DELETED]')
              ? itemOrId.category
              : itemOrId.type || 'Kursi',
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        },
        ...filtered,
      ])
    }
  } catch {
    /* ignore */
  }
}

export const removeSoftDeletedRecord = (id, name = '') => {
  try {
    const current = readSoftDeletedIds()
    const lowerName = (name || '').toLowerCase()
    const filteredIds = current.filter(
      (entry) => entry !== String(id) && (!lowerName || entry !== `name:${lowerName}`),
    )
    localStorage.setItem(SOFT_DELETED_FURN_KEY, JSON.stringify(filteredIds))

    const archive = readSoftDeletedArchive()
    writeSoftDeletedArchive(
      archive.filter(
        (a) =>
          String(a.id) !== String(id) &&
          (!lowerName || (a.name || '').toLowerCase() !== lowerName),
      ),
    )
  } catch {
    /* ignore */
  }
}

export const isItemSoftDeleted = (item, deletedRegistry = readSoftDeletedIds()) => {
  if (!item) return true
  if (item.is_deleted === true || Boolean(item.deleted_at)) return true
  if (String(item.category || '').startsWith('[DELETED]')) return true
  if (String(item.name || '').startsWith('[DELETED]')) return true
  if (deletedRegistry.includes(String(item.id))) return true
  if (item.name && deletedRegistry.includes(`name:${item.name.toLowerCase()}`)) return true
  return false
}

export const readLocalCatalog = () => {
  const deletedRegistry = readSoftDeletedIds()
  try {
    const raw = localStorage.getItem(LOCAL_CATALOG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((item) => !isItemSoftDeleted(item, deletedRegistry))
      }
    }
    localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(FURNITURES_LOCAL))
    return FURNITURES_LOCAL.filter((item) => !isItemSoftDeleted(item, deletedRegistry))
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
    localStorage.removeItem(SOFT_DELETED_FURN_KEY)
    localStorage.removeItem(SOFT_DELETED_ARCHIVE_KEY)
    localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(FURNITURES_LOCAL))
    return [...FURNITURES_LOCAL]
  } catch {
    return [...FURNITURES_LOCAL]
  }
}

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

  const rawCategory = item.category || item.type || 'Kursi'
  const category = String(rawCategory).startsWith('[DELETED]')
    ? item.original_category || 'Kursi'
    : rawCategory
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
    is_deleted: Boolean(item.is_deleted) || String(rawCategory).startsWith('[DELETED]'),
    deleted_at: item.deleted_at || null,
    specs: specsList,
    ingredients: specsList,
    steps: stepsList,
  }
}

class FurnitureService {
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
      is_deleted: false,
      deleted_at: null,
    }

    try {
      const res = await apiClient.post('/rest/v1/furnitures', fullPayload, {
        headers: { Prefer: 'return=representation' },
      })
      return normalizeFurniture(Array.isArray(res) ? res[0] : res)
    } catch {
      const fallbackPayload = {
        name: fullPayload.name,
        category: fullPayload.category,
        material: fullPayload.material,
        assembly_type: fullPayload.assembly_type,
        price: fullPayload.price,
        description: fullPayload.description,
        specs: fullPayload.specs,
        steps: fullPayload.steps,
        image_url: fullPayload.image_url,
        is_featured: fullPayload.is_featured,
      }
      const res2 = await apiClient.post('/rest/v1/furnitures', fallbackPayload, {
        headers: { Prefer: 'return=representation' },
      })
      return normalizeFurniture(Array.isArray(res2) ? res2[0] : res2)
    }
  }

  /**
   * READ: Mengambil daftar produk aktif dan daftar produk yang di-soft-delete
   */
  async getFurnitures(params = {}) {
    const deletedRegistry = readSoftDeletedIds()
    const localArchive = readSoftDeletedArchive()

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
        const data = await apiClient.get(`/rest/v1/furnitures?${queryString}`)
        const allRows = Array.isArray(data) ? data : []

        let activeList = allRows
          .filter((row) => !isItemSoftDeleted(row, deletedRegistry))
          .map(normalizeFurniture)

        // Gabungkan baris yang di-soft-delete di server maupun arsip lokal
        const remoteDeleted = allRows
          .filter((row) => isItemSoftDeleted(row, deletedRegistry))
          .map(normalizeFurniture)

        const deletedMap = new Map()
        localArchive.forEach((item) => deletedMap.set(String(item.id), normalizeFurniture(item)))
        remoteDeleted.forEach((item) => deletedMap.set(String(item.id), item))
        const deletedList = Array.from(deletedMap.values())

        const isUnfiltered =
          !params.search && (!params.category || params.category === 'Semua' || params.category === 'All')
        if (allRows.length === 0 && isUnfiltered) {
          const seeded = []
          for (const seedItem of FURNITURES_LOCAL) {
            try {
              const created = await this._insertToSupabase(seedItem)
              if (created) seeded.push(created)
            } catch {
              /* ignore */
            }
          }
          if (seeded.length > 0) {
            activeList = seeded
          }
        }

        writeLocalCatalog(activeList)
        return {
          success: true,
          data: activeList,
          deletedData: deletedList,
          source: 'supabase',
          pagination: {
            total: activeList.length,
            page: params.page || 1,
            limit: params.limit || 50,
          },
        }
      } catch (err) {
        console.warn('[FurnitureService] Gagal membaca Supabase, beralih ke LocalStorage:', err.message)
      }
    }

    const localItems = readLocalCatalog().map(normalizeFurniture)
    const deletedList = localArchive.map(normalizeFurniture)
    return {
      success: true,
      data: localItems,
      deletedData: deletedList,
      source: 'local',
      pagination: {
        total: localItems.length,
        page: 1,
        limit: 50,
      },
    }
  }

  async getFurnitureById(id) {
    if (isSupabaseConfigured() && navigator.onLine && !String(id).startsWith('furn-')) {
      try {
        const data = await apiClient.get(`/rest/v1/furnitures?id=eq.${id}&select=*`)
        if (Array.isArray(data) && data.length > 0 && !isItemSoftDeleted(data[0])) {
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

  async createFurniture(data) {
    if (isSupabaseConfigured() && navigator.onLine) {
      try {
        const created = await this._insertToSupabase(data)
        const current = readLocalCatalog()
        writeLocalCatalog([created, ...current.filter((i) => String(i.id) !== String(created.id))])
        return { success: true, source: 'supabase', data: created }
      } catch (err) {
        console.error('[FurnitureService] Error saat INSERT ke Supabase:', err)
      }
    }

    const localCreated = normalizeFurniture({
      ...data,
      id: `furn-${Date.now()}`,
      is_deleted: false,
      deleted_at: null,
      created_at: new Date().toISOString(),
    })
    const current = readLocalCatalog()
    writeLocalCatalog([localCreated, ...current])
    return {
      success: true,
      source: 'local',
      data: localCreated,
    }
  }

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
          const res = await apiClient.patch(`/rest/v1/furnitures?id=eq.${targetDbId}`, payload, {
            headers: { Prefer: 'return=representation' },
          })
          const row = Array.isArray(res) ? res[0] : res
          updated = normalizeFurniture(row || { ...data, ...payload, id: targetDbId })
        } else {
          updated = await this._insertToSupabase({ ...data, ...payload })
        }

        const current = readLocalCatalog()
        const idx = current.findIndex(
          (item) => String(item.id) === String(id) || String(item.id) === String(updated.id),
        )
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
   * SOFT DELETE: Menandai item sebagai terhapus (is_deleted = true, deleted_at = timestamp)
   */
  async deleteFurniture(id, itemName = '', fullItem = null) {
    const nowIso = new Date().toISOString()
    const current = readLocalCatalog()
    const targetObj =
      fullItem ||
      current.find(
        (item) => String(item.id) === String(id) || (itemName && item.name === itemName),
      ) || { id, name: itemName }

    addSoftDeletedRecord(targetObj, itemName)

    if (isSupabaseConfigured() && navigator.onLine) {
      try {
        const filterQuery = !String(id).startsWith('furn-')
          ? `id=eq.${id}`
          : itemName
          ? `name=eq.${encodeURIComponent(itemName)}`
          : null

        if (filterQuery) {
          try {
            await apiClient.patch(
              `/rest/v1/furnitures?${filterQuery}`,
              {
                is_deleted: true,
                deleted_at: nowIso,
                updated_at: nowIso,
              },
              { headers: { Prefer: 'return=minimal' } },
            )
          } catch {
            await apiClient.patch(
              `/rest/v1/furnitures?${filterQuery}`,
              {
                category: '[DELETED]',
                updated_at: nowIso,
              },
              { headers: { Prefer: 'return=minimal' } },
            )
          }
        }
      } catch (err) {
        console.warn('[FurnitureService] Soft delete lokal diterapkan:', err.message)
      }
    }

    writeLocalCatalog(
      current.filter(
        (item) =>
          String(item.id) !== String(id) &&
          (!itemName || item.name !== itemName),
      ),
    )
    return { success: true, softDeleted: true, deleted_at: nowIso }
  }

  /**
   * RESTORE (Kembalikan dari Soft Delete): Mengubah is_deleted = false & deleted_at = null
   */
  async restoreFurniture(item) {
    if (!item) return { success: false }
    const id = item.id
    const itemName = item.name || ''
    const restoredCategory =
      item.original_category ||
      (item.category && !String(item.category).startsWith('[DELETED]') ? item.category : 'Kursi')

    removeSoftDeletedRecord(id, itemName)

    if (isSupabaseConfigured() && navigator.onLine) {
      try {
        const filterQuery = !String(id).startsWith('furn-')
          ? `id=eq.${id}`
          : itemName
          ? `name=eq.${encodeURIComponent(itemName)}`
          : null

        if (filterQuery) {
          try {
            await apiClient.patch(
              `/rest/v1/furnitures?${filterQuery}`,
              {
                is_deleted: false,
                deleted_at: null,
                category: restoredCategory,
                updated_at: new Date().toISOString(),
              },
              { headers: { Prefer: 'return=minimal' } },
            )
          } catch {
            await apiClient.patch(
              `/rest/v1/furnitures?${filterQuery}`,
              {
                category: restoredCategory,
                updated_at: new Date().toISOString(),
              },
              { headers: { Prefer: 'return=minimal' } },
            )
          }
        }
      } catch (err) {
        console.warn('[FurnitureService] Restore lokal diterapkan:', err.message)
      }
    }

    const restoredObj = normalizeFurniture({
      ...item,
      category: restoredCategory,
      type: restoredCategory,
      is_deleted: false,
      deleted_at: null,
    })
    const current = readLocalCatalog()
    if (!current.some((c) => String(c.id) === String(restoredObj.id))) {
      writeLocalCatalog([restoredObj, ...current])
    }
    return { success: true, data: restoredObj }
  }

  /**
   * HARD DELETE (Hapus Permanen dari Database): Menghapus baris fisik dari `public.furnitures`
   */
  async hardDeleteFurniture(id, itemName = '') {
    removeSoftDeletedRecord(id, itemName)

    if (isSupabaseConfigured() && navigator.onLine) {
      try {
        const filterQuery = !String(id).startsWith('furn-')
          ? `id=eq.${id}`
          : itemName
          ? `name=eq.${encodeURIComponent(itemName)}`
          : null
        if (filterQuery) {
          await apiClient.delete(`/rest/v1/furnitures?${filterQuery}`)
        }
      } catch (err) {
        console.warn('[FurnitureService] Gagal hard delete di Supabase:', err.message)
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
    return { success: true, hardDeleted: true }
  }
}

export default new FurnitureService()
