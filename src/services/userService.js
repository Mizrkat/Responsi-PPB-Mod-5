import { apiClient, isSupabaseConfigured } from '../config/api'
import uploadService from './uploadService'

const USER_IDENTIFIER_KEY = 'kayu_ruang_user_id'
const USER_PROFILE_KEY = 'kayu_ruang_user_profile_v2'
const DEFAULT_SEED_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

const DEFAULT_PROFILE_DATA = {
  id: null,
  username: 'Radhine Muhammad Rossie',
  nim: '21120124120017',
  kelompok: 'Kelompok 37 — Praktikum PPB',
  prodi: 'Teknik Komputer — Universitas Diponegoro',
  bio: 'Pengembang Aplikasi Progressive Web App (PWA) Katalog & Inventaris Toko Furniture Kayu & Ruang.',
  avatar: null,
  avatar_url: null,
  userId: DEFAULT_SEED_UUID,
}

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
        ...DEFAULT_PROFILE_DATA,
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
    ...DEFAULT_PROFILE_DATA,
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
      ...DEFAULT_PROFILE_DATA,
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

const normalizeProfileRow = (row, fallback) => ({
  id: row.id ?? fallback.id ?? null,
  userId: row.user_id || fallback.userId || DEFAULT_SEED_UUID,
  user_id: row.user_id || fallback.userId || DEFAULT_SEED_UUID,
  username:
    row.username && row.username !== 'Mahasiswa Praktikan PPB'
      ? row.username
      : fallback.username || DEFAULT_PROFILE_DATA.username,
  nim:
    row.nim && row.nim !== '21120123140001'
      ? row.nim
      : fallback.nim || DEFAULT_PROFILE_DATA.nim,
  kelompok:
    row.kelompok && !String(row.kelompok).includes('Kelompok 05')
      ? row.kelompok
      : fallback.kelompok || DEFAULT_PROFILE_DATA.kelompok,
  prodi: row.prodi || fallback.prodi || DEFAULT_PROFILE_DATA.prodi,
  bio: row.bio ?? fallback.bio ?? DEFAULT_PROFILE_DATA.bio,
  avatar: row.avatar_url || row.avatar || fallback.avatar || null,
  avatar_url: row.avatar_url || row.avatar || fallback.avatar_url || null,
  updatedAt: row.updated_at || new Date().toISOString(),
})

export const fetchProfileFromSupabase = async () => {
  const userId = getUserIdentifier()
  const localProf = getUserProfile()

  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      let rows = await apiClient.get(
        `/rest/v1/profiles?user_id=eq.${userId}&select=*&limit=1`,
      )
      if (!Array.isArray(rows) || rows.length === 0) {
        rows = await apiClient.get('/rest/v1/profiles?select=*&order=id.asc&limit=1')
      }

      if (Array.isArray(rows) && rows.length > 0) {
        const row = rows[0]
        // Jika baris di database masih berisi data placeholder lama (Kelompok 05 / 21120123140001),
        // otomatis perbarui ke profil default baru (Radhine Muhammad Rossie - 21120124120017 - Kelompok 37)
        if (
          row.username === 'Mahasiswa Praktikan PPB' ||
          row.nim === '21120123140001' ||
          String(row.kelompok || '').includes('Kelompok 05')
        ) {
          const updatedDefault = await apiClient.patch(
            `/rest/v1/profiles?id=eq.${row.id}`,
            {
              username: DEFAULT_PROFILE_DATA.username,
              nim: DEFAULT_PROFILE_DATA.nim,
              kelompok: DEFAULT_PROFILE_DATA.kelompok,
              prodi: DEFAULT_PROFILE_DATA.prodi,
              bio: DEFAULT_PROFILE_DATA.bio,
              updated_at: new Date().toISOString(),
            },
            { headers: { Prefer: 'return=representation' } },
          )
          const patchedRow = Array.isArray(updatedDefault) ? updatedDefault[0] : updatedDefault
          const normalized = normalizeProfileRow(patchedRow || row, DEFAULT_PROFILE_DATA)
          saveUserProfile(normalized)
          return { success: true, source: 'supabase', data: normalized }
        }

        const normalized = normalizeProfileRow(row, localProf)
        saveUserProfile(normalized)
        return { success: true, source: 'supabase', data: normalized }
      }

      const seedPayload = {
        user_id: userId,
        username: localProf.username || DEFAULT_PROFILE_DATA.username,
        nim: localProf.nim || DEFAULT_PROFILE_DATA.nim,
        kelompok: localProf.kelompok || DEFAULT_PROFILE_DATA.kelompok,
        prodi: localProf.prodi || DEFAULT_PROFILE_DATA.prodi,
        bio: localProf.bio || DEFAULT_PROFILE_DATA.bio,
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

export const saveProfileToSupabase = async (profile) => {
  const userId = profile.userId || profile.user_id || getUserIdentifier()
  const cleanUsername = (profile.username || '').trim() || DEFAULT_PROFILE_DATA.username
  const cleanNim = (profile.nim || '').trim() || DEFAULT_PROFILE_DATA.nim
  const cleanKelompok = (profile.kelompok || '').trim() || DEFAULT_PROFILE_DATA.kelompok
  const cleanProdi = (profile.prodi || '').trim() || DEFAULT_PROFILE_DATA.prodi
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
        try {
          const res = await apiClient.patch(
            `/rest/v1/profiles?id=eq.${existingRow.id}`,
            fullPayload,
            { headers: { Prefer: 'return=representation' } },
          )
          savedRow = Array.isArray(res) ? res[0] : res
        } catch {
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
        warning: err.message,
      }
    }
  }

  return {
    ...localSaved,
    source: 'local',
  }
}

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
