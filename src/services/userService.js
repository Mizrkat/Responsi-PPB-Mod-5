import { apiClient, isSupabaseConfigured } from '../config/api'
import uploadService from './uploadService'

// ---------------------------------------------------------------------------
// userService.js — CRUD Profil Akun Praktikan ke Tabel `public.profiles` Supabase
// Menggunakan alur eksplisit:
//   - READ (GET /rest/v1/profiles) + Auto-Seed jika tabel kosong
//   - UPDATE (PATCH /rest/v1/profiles?id=eq.<id>) jika baris profil sudah ada
//   - CREATE (POST /rest/v1/profiles) jika baris profil belum ada
// ---------------------------------------------------------------------------
const USER_IDENTIFIER_KEY = 'kayu_ruang_user_id'
const USER_PROFILE_KEY = 'kayu_ruang_user_profile'
const DEFAULT_SEED_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

const isValidUUID = (str) =>
  typeof str === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)

export const getUserIdentifier = () => {
  try {
    let userId = localStorage.getItem(USER_IDENTIFIER_KEY)
    if (!userId || !isValidUUID(userId)) {
      userId = DEFAULT_SEED_UUID
      localStorage.setItem(USER_IDENTIFIER_KEY, userId)
    }
    return userId
  } catch {
    return DEFAULT_SEED_UUID
  }
}

export const getUserProfile = () => {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ...parsed,
        userId: parsed.userId || parsed.user_id || getUserIdentifier(),
        avatar: parsed.avatar_url || parsed.avatar || null,
        avatar_url: parsed.avatar_url || parsed.avatar || null,
      }
    }
  } catch {
    /* fallback */
  }
  return {
    id: null,
    username: 'Mahasiswa Praktikan PPB',
    nim: '21120123140001',
    kelompok: 'Kelompok 05 — Praktikum PPB',
    prodi: 'Teknik Komputer — Universitas Diponegoro',
    bio: 'Pengembang Aplikasi Progressive Web App (PWA) Katalog Toko Furniture Kayu & Ruang.',
    avatar: null,
    avatar_url: null,
    userId: getUserIdentifier(),
  }
}

export const saveUserProfile = (profile) => {
  try {
    const userId = profile.userId || profile.user_id || getUserIdentifier()
    if (isValidUUID(userId)) {
      localStorage.setItem(USER_IDENTIFIER_KEY, userId)
    }
    const data = {
      ...profile,
      userId,
      user_id: userId,
      avatar: profile.avatar_url ?? profile.avatar ?? null,
      avatar_url: profile.avatar_url ?? profile.avatar ?? null,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(data))
    return { success: true, data }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

/**
 * Normalisasi baris dari tabel `public.profiles`
 */
const normalizeProfileRow = (row, fallback) => ({
  id: row.id ?? fallback.id ?? null,
  userId: row.user_id || fallback.userId || DEFAULT_SEED_UUID,
  user_id: row.user_id || fallback.userId || DEFAULT_SEED_UUID,
  username: row.username || row.name || fallback.username || 'Mahasiswa Praktikan PPB',
  nim: row.nim || fallback.nim || '21120123140001',
  kelompok: row.kelompok || row.group_name || fallback.kelompok || 'Kelompok 05',
  prodi: row.prodi || fallback.prodi || 'Teknik Komputer — Universitas Diponegoro',
  bio: row.bio ?? fallback.bio ?? '',
  avatar: row.avatar_url || row.avatar || fallback.avatar || null,
  avatar_url: row.avatar_url || row.avatar || fallback.avatar_url || null,
  updatedAt: row.updated_at || new Date().toISOString(),
})

/**
 * READ: Mengambil data profil akun dari tabel `public.profiles` di Supabase.
 * Jika tabel `public.profiles` masih kosong (0 baris), otomatis melakukan INSERT baris awal.
 */
export const fetchProfileFromSupabase = async () => {
  const userId = getUserIdentifier()
  const localProf = getUserProfile()

  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      // 1. Cari berdasarkan user_id aktif
      let rows = await apiClient.get(
        `/rest/v1/profiles?user_id=eq.${userId}&select=*&limit=1`,
      )
      // 2. Jika belum ada yang cocok dengan user_id lokal, ambil baris profil terbaru di tabel public.profiles
      if (!Array.isArray(rows) || rows.length === 0) {
        rows = await apiClient.get('/rest/v1/profiles?select=*&order=id.asc&limit=1')
      }

      if (Array.isArray(rows) && rows.length > 0) {
        const normalized = normalizeProfileRow(rows[0], localProf)
        saveUserProfile(normalized)
        return { success: true, source: 'supabase', data: normalized }
      }

      // 3. Jika tabel public.profiles kosong (0 baris), buat baris pertama secara otomatis (CREATE)
      const seedPayload = {
        user_id: userId,
        username: localProf.username || 'Mahasiswa Praktikan PPB',
        nim: localProf.nim || '21120123140001',
        kelompok: localProf.kelompok || 'Kelompok 05 — Praktikum PPB',
        prodi: localProf.prodi || 'Teknik Komputer — Universitas Diponegoro',
        bio: localProf.bio || '',
        avatar_url: localProf.avatar_url || null,
      }
      const inserted = await apiClient.post('/rest/v1/profiles', seedPayload, {
        headers: { Prefer: 'return=representation' },
      })
      const createdRow = Array.isArray(inserted) ? inserted[0] : inserted
      if (createdRow) {
        const normalized = normalizeProfileRow(createdRow, localProf)
        saveUserProfile(normalized)
        return { success: true, source: 'supabase', data: normalized }
      }
    } catch (err) {
      console.warn('[userService] Gagal membaca tabel public.profiles:', err.message)
      return {
        success: true,
        source: 'local',
        warning: err.message,
        data: localProf,
      }
    }
  }

  return { success: true, source: 'local', data: localProf }
}

/**
 * UPDATE / CREATE: Menyimpan perubahan profil akun ke tabel `public.profiles` di Supabase.
 * Menggunakan pengecekan baris eksplisit (GET -> PATCH berdasarkan id/user_id, atau POST jika belum ada)
 * sehingga tidak pernah gagal akibat constraint on_conflict.
 */
export const saveProfileToSupabase = async (profile) => {
  const userId = profile.userId || profile.user_id || getUserIdentifier()
  const cleanUsername = (profile.username || '').trim() || 'Mahasiswa Praktikan PPB'
  const cleanNim = (profile.nim || '').trim() || '21120123140001'
  const cleanKelompok = (profile.kelompok || '').trim() || 'Kelompok 05'
  const cleanProdi = (profile.prodi || '').trim() || 'Teknik Komputer — Universitas Diponegoro'
  const cleanBio = (profile.bio || '').trim()
  const cleanAvatar = profile.avatar_url ?? profile.avatar ?? null

  const localSaved = saveUserProfile({
    ...profile,
    userId,
    username: cleanUsername,
    nim: cleanNim,
    kelompok: cleanKelompok,
    prodi: cleanProdi,
    bio: cleanBio,
    avatar: cleanAvatar,
    avatar_url: cleanAvatar,
  })

  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      // 1. Cari apakah sudah ada baris di tabel public.profiles
      let existingRow = null
      if (profile.id) {
        const byId = await apiClient.get(`/rest/v1/profiles?id=eq.${profile.id}&select=*&limit=1`)
        if (Array.isArray(byId) && byId.length > 0) existingRow = byId[0]
      }
      if (!existingRow) {
        const byUser = await apiClient.get(`/rest/v1/profiles?user_id=eq.${userId}&select=*&limit=1`)
        if (Array.isArray(byUser) && byUser.length > 0) existingRow = byUser[0]
      }
      if (!existingRow) {
        const anyRow = await apiClient.get('/rest/v1/profiles?select=*&order=id.asc&limit=1')
        if (Array.isArray(anyRow) && anyRow.length > 0) existingRow = anyRow[0]
      }

      const fullPayload = {
        username: cleanUsername,
        nim: cleanNim,
        kelompok: cleanKelompok,
        prodi: cleanProdi,
        bio: cleanBio,
        avatar_url: cleanAvatar,
        updated_at: new Date().toISOString(),
      }

      let savedRow = null

      if (existingRow && existingRow.id !== undefined) {
        // 2A. UPDATE baris yang sudah ada menggunakan PATCH berdasarkan id
        try {
          const res = await apiClient.patch(
            `/rest/v1/profiles?id=eq.${existingRow.id}`,
            fullPayload,
            { headers: { Prefer: 'return=representation' } },
          )
          savedRow = Array.isArray(res) ? res[0] : res
        } catch {
          // Fallback jika tabel kustom pengguna hanya memiliki kolom dasar
          const minimalPayload = {
            username: cleanUsername,
            nim: cleanNim,
            kelompok: cleanKelompok,
          }
          const resMin = await apiClient.patch(
            `/rest/v1/profiles?id=eq.${existingRow.id}`,
            minimalPayload,
            { headers: { Prefer: 'return=representation' } },
          )
          savedRow = Array.isArray(resMin) ? resMin[0] : resMin
        }
      } else {
        // 2B. CREATE baris baru menggunakan POST jika tabel public.profiles masih kosong
        try {
          const res = await apiClient.post(
            '/rest/v1/profiles',
            { user_id: userId, ...fullPayload },
            { headers: { Prefer: 'return=representation' } },
          )
          savedRow = Array.isArray(res) ? res[0] : res
        } catch {
          const minimalInsert = {
            user_id: userId,
            username: cleanUsername,
            nim: cleanNim,
            kelompok: cleanKelompok,
          }
          const resMin = await apiClient.post('/rest/v1/profiles', minimalInsert, {
            headers: { Prefer: 'return=representation' },
          })
          savedRow = Array.isArray(resMin) ? resMin[0] : resMin
        }
      }

      const merged = normalizeProfileRow(
        savedRow || { id: existingRow?.id, user_id: existingRow?.user_id || userId, ...fullPayload },
        localSaved.data,
      )
      saveUserProfile(merged)
      return { success: true, source: 'supabase', data: merged }
    } catch (err) {
      console.error('[userService] Gagal menyimpan profil ke Supabase:', err)
      return {
        ...localSaved,
        source: 'local',
        warning: err.message || 'Gagal menulis ke tabel public.profiles di Supabase.',
      }
    }
  }

  return {
    ...localSaved,
    source: 'local',
    warning: 'Konfigurasi .env Supabase belum aktif. Profil disimpan di LocalStorage.',
  }
}

/**
 * Mengunggah foto profil ke Supabase Storage Bucket (`avatars` / `furnitures`)
 * lalu langsung meng-update kolom `avatar_url` pada tabel `public.profiles`.
 */
export const uploadAvatarToSupabase = async (file) => {
  const uploadRes = await uploadService.uploadImage(file, 'avatars', 'profiles')
  const avatarUrl = uploadRes.data?.url
  const currentProfile = getUserProfile()
  const updatedProfile = {
    ...currentProfile,
    avatar: avatarUrl,
    avatar_url: avatarUrl,
  }

  const saveRes = await saveProfileToSupabase(updatedProfile)
  return {
    success: true,
    source: uploadRes.source,
    dbSource: saveRes.source,
    avatarUrl,
    profile: saveRes.data,
  }
}

export const updateAvatar = (avatarBase64) => {
  const profile = getUserProfile()
  profile.avatar = avatarBase64
  profile.avatar_url = avatarBase64
  return saveUserProfile(profile)
}

export default {
  getUserIdentifier,
  getUserProfile,
  saveUserProfile,
  fetchProfileFromSupabase,
  saveProfileToSupabase,
  uploadAvatarToSupabase,
  updateAvatar,
}
