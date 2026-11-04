import { apiClient, isSupabaseConfigured } from '../config/api'
import uploadService from './uploadService'
import FURNITURES_LOCAL from '../data/furnitures'

const LOCAL_CATALOG_KEY = 'kayu_ruang_catalog_items_v1'
const PENDING_FURNITURES_KEY = 'kayu_ruang_pending_furnitures_v1'
const SYNCED_ID_MAP_KEY = 'kayu_ruang_synced_id_map_v1'
const SOFT_DELETED_FURN_KEY = 'kayu_ruang_soft_deleted_furnitures_v1'
const SOFT_DELETED_ARCHIVE_KEY = 'kayu_ruang_soft_deleted_archive_v1'

const STATIC_SEED_IDS = new Set([
  'furn-101',
  'furn-102',
  'furn-103',
  'furn-104',
  'furn-105',
  'furn-106',
])

const ASSEMBLY_LABELS = {
  mudah: 'Siap Pakai (Fully Assembled)',
  sedang: 'Knockdown Mudah (15 Menit)',
  sulit: 'Custom / Instalasi Tim',
}

const formatAssemblyType = (val) => ASSEMBLY_LABELS[val] || val || 'Siap Pakai (Fully Assembled)'

// --- Persistent Offline Queue Helpers ---
export const readPendingFurnitures = () => {
  try {
    const raw = localStorage.getItem(PENDING_FURNITURES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const writePendingFurnitures = (items) => {
  try {
    localStorage.setItem(PENDING_FURNITURES_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
}

export const addPendingFurniture = (item) => {
  if (!item) return
  const current = readPendingFurnitures().filter((i) => String(i.id) !== String(item.id))
  writePendingFurnitures([{ ...item, pending_sync: true }, ...current])
}

export const removePendingFurniture = (id) => {
  const current = readPendingFurnitures().filter((i) => String(i.id) !== String(id))
  writePendingFurnitures(current)
}

export const readSyncedIdMap = () => {
  try {
    const raw = localStorage.getItem(SYNCED_ID_MAP_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export const saveSyncedIdMapping = (localId, remoteId) => {
  try {
    const map = readSyncedIdMap()
    map[String(localId)] = remoteId
    localStorage.setItem(SYNCED_ID_MAP_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

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
    localStorage.removeItem(PENDING_FURNITURES_KEY)
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

let isSyncingFurnitures = false

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

    // Jika gambar berupa Base64 Data URL (diunggah saat HP offline), coba unggah ke Storage Bucket terlebih dahulu
    let cleanImageUrl =
      data.image_url && !String(data.image_url).startsWith('blob:')
        ? data.image_url
        : '/furniture/chair.jpg'

    if (String(cleanImageUrl).startsWith('data:image/')) {
      const uploaded = await uploadService.uploadDataUrlToSupabase(
        cleanImageUrl,
        'furnitures',
        'products',
      )
      if (uploaded.success && uploaded.url) {
        cleanImageUrl = uploaded.url
      }
    }

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
   * SINKRONISASI OFFLINE -> ONLINE:
   * Mengirim seluruh item katalog yang ditambahkan saat HP offline ke tabel `public.furnitures` di Supabase.
   */
  async syncPendingFurnitures() {
    if (!isSupabaseConfigured() || !navigator.onLine || isSyncingFurnitures) {
      return { syncedCount: 0 }
    }

    isSyncingFurnitures = true
    let syncedCount = 0

    try {
      // Kumpulkan item dari antrean offline (PENDING_FURNITURES_KEY) maupun item lokal ber-ID 'furn-...'
      const pendingQueue = readPendingFurnitures()
      const localItems = readLocalCatalog()
      const customLocalItems = localItems.filter(
        (item) =>
          String(item.id).startsWith('furn-') &&
          !STATIC_SEED_IDS.has(String(item.id)),
      )

      const mergedPendingMap = new Map()
      pendingQueue.forEach((item) => mergedPendingMap.set(String(item.id), item))
      customLocalItems.forEach((item) => {
        if (!mergedPendingMap.has(String(item.id))) {
          mergedPendingMap.set(String(item.id), item)
        }
      })

      const toSync = Array.from(mergedPendingMap.values())
      if (toSync.length === 0) {
        return { syncedCount: 0 }
      }

      for (const offlineItem of toSync) {
        try {
          // Cek apakah sudah pernah masuk ke Supabase berdasarkan nama yang persis sama dalam beberapa detik terakhir
          const created = await this._insertToSupabase(offlineItem)
          if (created && created.id !== undefined) {
            saveSyncedIdMapping(offlineItem.id, created.id)
            removePendingFurniture(offlineItem.id)

            // Perbarui ID lokal di LOCAL_CATALOG_KEY menjadi ID database asli
            const latestLocal = readLocalCatalog()
            const updatedLocal = latestLocal.map((loc) =>
              String(loc.id) === String(offlineItem.id)
                ? { ...created, pending_sync: false }
                : loc,
            )
            writeLocalCatalog(updatedLocal)
            syncedCount++
          }
        } catch (err) {
          console.warn('[FurnitureService] Gagal sync item offline, akan dicoba lagi:', err.message)
        }
      }
    } finally {
      isSyncingFurnitures = false
    }

    return { syncedCount }
  }

  /**
   * READ: Mengambil daftar produk aktif & soft-deleted.
   * Wajib menjalankan syncPendingFurnitures() terlebih dahulu agar item offline masuk ke database!
   */
  async getFurnitures(params = {}) {
    const deletedRegistry = readSoftDeletedIds()
    const localArchive = readSoftDeletedArchive()

    if (isSupabaseConfigured() && navigator.onLine) {
      try {
        // 1. Sinkronkan item offline yang belum terkirim ke Supabase terlebih dahulu!
        await this.syncPendingFurnitures()

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

        // 2. Jika masih ada item di antrean offline yang belum berhasil ter-upload (misal sinyal baru menyambung),
        //    pertahankan di urutan teratas agar TIDAK hilang tertimpa!
        const remainingPending = readPendingFurnitures()
          .filter((p) => !isItemSoftDeleted(p, deletedRegistry))
          .map(normalizeFurniture)

        if (remainingPending.length > 0) {
          const existingNames = new Set(activeList.map((a) => (a.name || '').toLowerCase()))
          const stillUnsynced = remainingPending.filter(
            (p) => !existingNames.has((p.name || '').toLowerCase()),
          )
          activeList = [...stillUnsynced, ...activeList]
        }

        const remoteDeleted = allRows
          .filter((row) => isItemSoftDeleted(row, deletedRegistry))
          .map(normalizeFurniture)

        const deletedMap = new Map()
        localArchive.forEach((item) => deletedMap.set(String(item.id), normalizeFurniture(item)))
        remoteDeleted.forEach((item) => deletedMap.set(String(item.id), item))
        const deletedList = Array.from(deletedMap.values())

        const isUnfiltered =
          !params.search && (!params.category || params.category === 'Semua' || params.category === 'All')
        if (allRows.length === 0 && activeList.length === 0 && isUnfiltered) {
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
    const idMap = readSyncedIdMap()
    const resolvedId = idMap[String(id)] || id

    if (isSupabaseConfigured() && navigator.onLine && !String(resolvedId).startsWith('furn-')) {
      try {
        const data = await apiClient.get(`/rest/v1/furnitures?id=eq.${resolvedId}&select=*`)
        if (Array.isArray(data) && data.length > 0 && !isItemSoftDeleted(data[0])) {
          return { success: true, data: normalizeFurniture(data[0]) }
        }
      } catch {
        /* fallback */
      }
    }
    const localItems = readLocalCatalog()
    const found = localItems.find(
      (item) => String(item.id) === String(id) || String(item.id) === String(resolvedId),
    )
    if (found) {
      return { success: true, data: normalizeFurniture(found) }
    }
    throw new Error('Produk furniture tidak ditemukan.')
  }

  /**
   * CREATE: Jika online langsung simpan ke Supabase; jika offline (atau koneksi HP terputus),
   * masukkan ke antrean `kayu_ruang_pending_furnitures_v1` agar otomatis di-sync saat online kembali!
   */
  async createFurniture(data) {
    if (isSupabaseConfigured() && navigator.onLine) {
      try {
        const created = await this._insertToSupabase(data)
        const current = readLocalCatalog()
        writeLocalCatalog([created, ...current.filter((i) => String(i.id) !== String(created.id))])
        return { success: true, source: 'supabase', data: created }
      } catch (err) {
        console.warn('[FurnitureService] Koneksi gagal saat INSERT, memasukkan ke antrean sync offline:', err.message)
      }
    }

    const localCreated = normalizeFurniture({
      ...data,
      id: `furn-${Date.now()}`,
      pending_sync: true,
      is_deleted: false,
      deleted_at: null,
      created_at: new Date().toISOString(),
    })

    // Simpan ke antrean pending offline & katalog lokal
    addPendingFurniture(localCreated)
    const current = readLocalCatalog()
    writeLocalCatalog([localCreated, ...current])

    return {
      success: true,
      source: 'offline_queue',
      data: localCreated,
    }
  }

  async updateFurniture(id, data) {
    const idMap = readSyncedIdMap()
    const actualId = idMap[String(id)] || id

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
        let targetDbId = !String(actualId).startsWith('furn-') ? actualId : null
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
          if (updated && updated.id) {
            saveSyncedIdMapping(id, updated.id)
            removePendingFurniture(id)
          }
        }

        const current = readLocalCatalog()
        const idx = current.findIndex(
          (item) =>
            String(item.id) === String(id) ||
            String(item.id) === String(actualId) ||
            String(item.id) === String(updated.id),
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
      pending_sync: true,
    })
    if (String(id).startsWith('furn-')) {
      addPendingFurniture(updatedItem)
    }
    if (idx > -1) {
      current[idx] = updatedItem
    } else {
      current.unshift(updatedItem)
    }
    writeLocalCatalog(current)
    return { success: true, source: 'local', data: updatedItem }
  }

  async deleteFurniture(id, itemName = '', fullItem = null) {
    const nowIso = new Date().toISOString()
    const current = readLocalCatalog()
    const targetObj =
      fullItem ||
      current.find(
        (item) => String(item.id) === String(id) || (itemName && item.name === itemName),
      ) || { id, name: itemName }

    addSoftDeletedRecord(targetObj, itemName)
    removePendingFurniture(id)

    if (isSupabaseConfigured() && navigator.onLine) {
      try {
        const idMap = readSyncedIdMap()
        const resolvedId = idMap[String(id)] || id
        const filterQuery = !String(resolvedId).startsWith('furn-')
          ? `id=eq.${resolvedId}`
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
        const idMap = readSyncedIdMap()
        const resolvedId = idMap[String(id)] || id
        const filterQuery = !String(resolvedId).startsWith('furn-')
          ? `id=eq.${resolvedId}`
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

  async hardDeleteFurniture(id, itemName = '') {
    removeSoftDeletedRecord(id, itemName)
    removePendingFurniture(id)

    if (isSupabaseConfigured() && navigator.onLine) {
      try {
        const idMap = readSyncedIdMap()
        const resolvedId = idMap[String(id)] || id
        const filterQuery = !String(resolvedId).startsWith('furn-')
          ? `id=eq.${resolvedId}`
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
