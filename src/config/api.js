import axios from 'axios'

// ---------------------------------------------------------------------------
// Base URL & Supabase Key Configuration
// Membaca dari file .env (import.meta.env) dengan dukungan runtime override
// dari localStorage agar praktikan dapat menguji berbagai proyek Supabase.
// ---------------------------------------------------------------------------
const ENV_STORAGE_KEY = 'kayu_ruang_supabase_env'

export const getDefaultEnvConfig = () => ({
  VITE_API_BASE_URL:
    import.meta.env.VITE_API_BASE_URL || 'https://sxunubxupdxyupnebuid.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY:
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    'sb_publishable_TXg9-r3ZVI8YZMzE90nwsQ_PU9GAmzg',
  VITE_SUPABASE_BUCKET: import.meta.env.VITE_SUPABASE_BUCKET || 'guns',
})

export const getActiveEnvConfig = () => {
  const defaults = getDefaultEnvConfig()
  try {
    const raw = localStorage.getItem(ENV_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        VITE_API_BASE_URL: parsed.VITE_API_BASE_URL || defaults.VITE_API_BASE_URL,
        VITE_SUPABASE_PUBLISHABLE_KEY:
          parsed.VITE_SUPABASE_PUBLISHABLE_KEY || defaults.VITE_SUPABASE_PUBLISHABLE_KEY,
        VITE_SUPABASE_BUCKET: parsed.VITE_SUPABASE_BUCKET || defaults.VITE_SUPABASE_BUCKET,
      }
    }
  } catch {
    /* ignore */
  }
  return defaults
}

export const saveActiveEnvConfig = (config) => {
  try {
    localStorage.setItem(ENV_STORAGE_KEY, JSON.stringify(config))
    return true
  } catch {
    return false
  }
}

export const resetActiveEnvConfig = () => {
  try {
    localStorage.removeItem(ENV_STORAGE_KEY)
  } catch {
    /* ignore */
  }
  return getDefaultEnvConfig()
}

const initialEnv = getActiveEnvConfig()
const BASE_URL = initialEnv.VITE_API_BASE_URL
const SUPABASE_KEY = initialEnv.VITE_SUPABASE_PUBLISHABLE_KEY
const IS_SUPABASE = BASE_URL.includes('supabase.co') || Boolean(SUPABASE_KEY)

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
})

// ---------------------------------------------------------------------------
// Request interceptor — attach dynamic Supabase baseURL & headers (apikey & Bearer)
// ---------------------------------------------------------------------------
apiClient.interceptors.request.use(
  (config) => {
    const currentEnv = getActiveEnvConfig()
    if (currentEnv.VITE_API_BASE_URL) {
      config.baseURL = currentEnv.VITE_API_BASE_URL.replace(/\/+$/, '')
    }
    if (currentEnv.VITE_SUPABASE_PUBLISHABLE_KEY) {
      config.headers['apikey'] = currentEnv.VITE_SUPABASE_PUBLISHABLE_KEY
      config.headers['Authorization'] = `Bearer ${currentEnv.VITE_SUPABASE_PUBLISHABLE_KEY}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ---------------------------------------------------------------------------
// Response interceptor — unwrap response and normalise errors
// ---------------------------------------------------------------------------
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    let message = 'Terjadi kesalahan pada jaringan atau server.'
    let status = null
    if (error.response) {
      status = error.response.status
      message =
        error.response.data?.message ||
        error.response.data?.msg ||
        error.response.data?.error ||
        error.response.data?.error_description ||
        `Server error (${status})`
    } else if (error.request) {
      message =
        'Server tidak dapat dijangkau. Aplikasi otomatis menggunakan penyimpanan offline (LocalStorage).'
    } else {
      message = error.message || message
    }
    return Promise.reject({
      message,
      status,
      code: error.response?.data?.code,
      raw: error.response?.data,
    })
  },
)

export { apiClient, BASE_URL, SUPABASE_KEY, IS_SUPABASE }
