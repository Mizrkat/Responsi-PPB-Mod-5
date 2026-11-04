export const formatPrice = (price) => {
  const num = Number(price)
  if (Number.isNaN(num)) return 'Rp 0'
  return `Rp ${num.toLocaleString('id-ID')}`
}

export const matchesSearch = (item, query) => {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    (item.name || '').toLowerCase().includes(q) ||
    (item.description || '').toLowerCase().includes(q) ||
    (item.material || item.caliber || '').toLowerCase().includes(q)
  )
}

export const matchesCategory = (item, category) => {
  if (!category || category === 'Semua' || category === 'All') return true
  return (
    (item.category || item.type || '').toLowerCase() === category.toLowerCase()
  )
}

export const sortItems = (items, key = 'name', order = 'asc') => {
  const sorted = [...items].sort((a, b) => {
    if (key === 'price') return (Number(a.price) || 0) - (Number(b.price) || 0)
    return String(a[key] || '').localeCompare(String(b[key] || ''))
  })
  return order === 'desc' ? sorted.reverse() : sorted
}

export const truncate = (str, max = 90) => {
  if (!str || str.length <= max) return str || ''
  return str.slice(0, max).trimEnd() + '…'
}

export const extractCategories = (items) => {
  const set = new Set(['Kursi', 'Meja', 'Sofa', 'Kabinet', 'Tempat Tidur', 'Meja Kerja'])
  items.forEach((i) => {
    const cat = i.category || i.type
    if (cat) set.add(cat)
  })
  return ['Semua', ...Array.from(set)]
}

export const averageRating = (reviews) => {
  if (!reviews || reviews.length === 0) return 0
  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0)
  return Math.round((sum / reviews.length) * 10) / 10
}

/**
 * Menghasilkan link autentik yang dapat dibagikan untuk setiap item katalog
 */
export const getProductShareUrl = (itemId) => {
  if (typeof window === 'undefined') return `?produk=${encodeURIComponent(itemId)}`
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}?produk=${encodeURIComponent(itemId)}`
}

/**
 * Menyalin link produk ke clipboard
 */
export const copyProductShareLink = async (item) => {
  const url = getProductShareUrl(item.id || item.name)
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = url
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
  } catch {
    /* ignore */
  }
  return url
}

/**
 * Membuat link WhatsApp ke nomor 08871979070 (628871979070)
 * dengan format teks "Hai saya pesan (nama barang yang dipesan)"
 */
export const buildWhatsAppOrderUrl = (items, buyerInfo = {}) => {
  const WA_NUMBER = '628871979070'
  const itemNames = items
    .map((i) => (Number(i.quantity) > 1 ? `${i.name} (${i.quantity}x)` : i.name))
    .join(', ')

  let message = `Hai saya pesan ${itemNames}`

  const total = items.reduce(
    (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1),
    0,
  )
  if (total > 0) {
    message += ` dengan total ${formatPrice(total)}.`
  }

  if (buyerInfo.name) {
    message += `
Nama Pemesan: ${buyerInfo.name}`
  }
  if (buyerInfo.address) {
    message += `
Alamat Pengiriman: ${buyerInfo.address}`
  }
  if (buyerInfo.notes) {
    message += `
Catatan: ${buyerInfo.notes}`
  }

  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`
}
