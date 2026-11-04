import axios from 'axios'

// ---------------------------------------------------------------------------
// Base URL & Supabase Publishable Key Configuration
// Membaca VITE_API_BASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY dari .env,
// membersihkan tanda kutip / trailing slash, serta mendukung runtime config.
// ---------------------------------------------------------------------------
const ENV_OVERRIDE_KEY = 'kayu_ruang_supabase_env_override'

const cleanEnvVal = (val) =>
  String(val || '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .trim()

export const getSupabaseConfig = () => {
  const envUrl = cleanEnvVal(
    import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_SUPABASE_URL || '',
  ).replace(/\/+$/, '')

  const envKey = cleanEnvVal(
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      import.meta.env.VITE_SUPABASE_KEY ||
      '',
  )

  try {
    const raw = localStorage.getItem(ENV_OVERRIDE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const overrideUrl = cleanEnvVal(parsed.VITE_API_BASE_URL).replace(/\/+$/, '')
      const overrideKey = cleanEnvVal(parsed.VITE_SUPABASE_PUBLISHABLE_KEY)
      if (
        overrideUrl &&
        overrideKey &&
        !overrideUrl.includes('YOUR_PROJECT_ID') &&
        !overrideKey.includes('YOUR_SUPABASE')
      ) {
        return { baseUrl: overrideUrl, supabaseKey: overrideKey }
      }
    }
  } catch {
    /* ignore */
  }

  return { baseUrl: envUrl, supabaseKey: envKey }
}

export const saveSupabaseConfigOverride = (url, key) => {
  try {
    localStorage.setItem(
      ENV_OVERRIDE_KEY,
      JSON.stringify({
        VITE_API_BASE_URL: cleanEnvVal(url).replace(/\/+$/, ''),
        VITE_SUPABASE_PUBLISHABLE_KEY: cleanEnvVal(key),
      }),
    )
    return true
  } catch {
    return false
  }
}

export const clearSupabaseConfigOverride = () => {
  try {
    localStorage.removeItem(ENV_OVERRIDE_KEY)
  } catch {
    /* ignore */
  }
}

export const isSupabaseConfigured = () => {
  const { baseUrl, supabaseKey } = getSupabaseConfig()
  return (
    Boolean(baseUrl && supabaseKey) &&
    !baseUrl.includes('YOUR_PROJECT_ID') &&
    !supabaseKey.includes('YOUR_SUPABASE')
  )
}

const initialCfg = getSupabaseConfig()
const BASE_URL = initialCfg.baseUrl
const SUPABASE_KEY = initialCfg.supabaseKey
const IS_SUPABASE = isSupabaseConfigured()

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 seconds
})

// ---------------------------------------------------------------------------
// Request interceptor — attach dynamic Supabase baseURL, apikey, & Bearer auth
// ---------------------------------------------------------------------------
apiClient.interceptors.request.use(
  (config) => {
    const { baseUrl, supabaseKey } = getSupabaseConfig()
    if (baseUrl && !baseUrl.includes('YOUR_PROJECT_ID')) {
      config.baseURL = baseUrl
    }
    if (supabaseKey && !supabaseKey.includes('YOUR_SUPABASE')) {
      config.headers['apikey'] = supabaseKey
      config.headers['Authorization'] = `Bearer ${supabaseKey}`
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
        error.response.data?.details ||
        error.response.data?.hint ||
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
