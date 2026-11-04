import { apiClient, IS_SUPABASE } from '../config/api'
import uploadService from './uploadService'

// ---------------------------------------------------------------------------
// userService.js — Manajemen Identitas & Profil Akun Praktikan
// Terhubung langsung ke Tabel Supabase `public.profiles` & Storage Bucket
// dengan fallback otomatis ke localStorage saat offline.
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
        avatar: parsed.avatar_url || parsed.avatar || null,
        avatar_url: parsed.avatar_url || parsed.avatar || null,
      }
    }
  } catch {
    /* fallback */
  }
  return {
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
    const data = {
      ...profile,
      avatar: profile.avatar_url || profile.avatar || null,
      avatar_url: profile.avatar_url || profile.avatar || null,
      userId: profile.userId || profile.user_id || getUserIdentifier(),
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(data))
    return { success: true, data }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

/**
 * Mengambil data profil akun dari tabel `public.profiles` di Supabase
 */
export const fetchProfileFromSupabase = async () => {
  const userId = getUserIdentifier()
  const localProf = getUserProfile()

  if (IS_SUPABASE && navigator.onLine) {
    try {
      // Cari berdasarkan user_id atau ambil baris profil pertama di tabel public.profiles
      let rows = await apiClient.get(
        `/rest/v1/profiles?user_id=eq.${userId}&select=*&limit=1`,
      )
      if (!Array.isArray(rows) || rows.length === 0) {
        rows = await apiClient.get('/rest/v1/profiles?select=*&order=updated_at.desc&limit=1')
      }

      if (Array.isArray(rows) && rows.length > 0) {
        const row = rows[0]
        const normalized = {
          id: row.id,
          userId: row.user_id || userId,
          user_id: row.user_id || userId,
          username: row.username || localProf.username,
          nim: row.nim || localProf.nim,
          kelompok: row.kelompok || localProf.kelompok,
          prodi: row.prodi || localProf.prodi,
          bio: row.bio || localProf.bio,
          avatar: row.avatar_url || localProf.avatar,
          avatar_url: row.avatar_url || localProf.avatar_url,
          updatedAt: row.updated_at,
        }
        if (row.user_id && isValidUUID(row.user_id)) {
          localStorage.setItem(USER_IDENTIFIER_KEY, row.user_id)
        }
        saveUserProfile(normalized)
        return { success: true, source: 'supabase', data: normalized }
      }
    } catch (err) {
      console.warn('[userService] Gagal membaca tabel public.profiles, menggunakan localStorage:', err.message)
    }
  }

  return { success: true, source: 'local', data: localProf }
}

/**
 * Menyimpan / Memperbarui profil akun ke tabel `public.profiles` di Supabase (UPSERT)
 */
export const saveProfileToSupabase = async (profile) => {
  const userId = profile.userId || profile.user_id || getUserIdentifier()
  const localSaved = saveUserProfile({ ...profile, userId })

  if (IS_SUPABASE && navigator.onLine) {
    try {
      const payload = {
        user_id: userId,
        username: (profile.username || '').trim() || 'Mahasiswa Praktikan PPB',
        nim: (profile.nim || '').trim() || '21120123140001',
        kelompok: (profile.kelompok || '').trim() || 'Kelompok 05',
        prodi: (profile.prodi || '').trim() || 'Teknik Komputer — Universitas Diponegoro',
        bio: (profile.bio || '').trim(),
        avatar_url: profile.avatar_url ?? profile.avatar ?? null,
        updated_at: new Date().toISOString(),
      }

      const res = await apiClient.post(
        '/rest/v1/profiles?on_conflict=user_id',
        payload,
        {
          headers: {
            Prefer: 'resolution=merge-duplicates,return=representation',
          },
        },
      )
      const savedRow = Array.isArray(res) ? res[0] : res
      const merged = {
        ...localSaved.data,
        ...(savedRow || {}),
        userId: savedRow?.user_id || userId,
        avatar: savedRow?.avatar_url || payload.avatar_url,
        avatar_url: savedRow?.avatar_url || payload.avatar_url,
      }
      saveUserProfile(merged)
      return { success: true, source: 'supabase', data: merged }
    } catch (err) {
      console.warn('[userService] Gagal menyimpan ke tabel public.profiles Supabase:', err.message)
    }
  }

  return { ...localSaved, source: 'local' }
}

/**
 * Mengunggah foto profil ke Supabase Storage Bucket (`avatars` / `furnitures`)
 * lalu memperbarui kolom `avatar_url` pada tabel `public.profiles`.
 */
export const uploadAvatarToSupabase = async (file) => {
  // Unggah ke bucket 'avatars' (atau fallback ke 'furnitures')
  let uploadRes = await uploadService.uploadImage(file, 'avatars', 'profiles')
  if (uploadRes.source !== 'supabase_storage') {
    uploadRes = await uploadService.uploadImage(file, 'furnitures', 'avatars')
  }

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
