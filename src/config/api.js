import axios from 'axios'

// ---------------------------------------------------------------------------
// Base URL & Supabase Publishable Key Configuration
// Hanya menggunakan 2 variabel dari .env:
//   - VITE_API_BASE_URL
//   - VITE_SUPABASE_PUBLISHABLE_KEY
// ---------------------------------------------------------------------------
const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''

const IS_SUPABASE =
  Boolean(BASE_URL && SUPABASE_KEY) &&
  !BASE_URL.includes('YOUR_PROJECT_ID')

if (!IS_SUPABASE) {
  console.warn(
    '[api] VITE_API_BASE_URL atau VITE_SUPABASE_PUBLISHABLE_KEY belum diisi dengan project Supabase aktif. Menggunakan fallback LocalStorage.',
  )
}

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
// Request interceptor — attach Supabase headers (apikey & Bearer auth)
// ---------------------------------------------------------------------------
apiClient.interceptors.request.use(
  (config) => {
    if (IS_SUPABASE && SUPABASE_KEY) {
      config.headers['apikey'] = SUPABASE_KEY
      if (!config.headers['Authorization']) {
        config.headers['Authorization'] = `Bearer ${SUPABASE_KEY}`
      }
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
    let message = 'Terjadi kesalahan pada server.'
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
        'Tidak dapat terhubung ke server Supabase. Periksa koneksi internet atau konfigurasi .env Anda.'
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
