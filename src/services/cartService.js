const CART_STORAGE_KEY = 'kayu_ruang_cart_v1'

export const readCart = () => {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const writeCart = (items) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    window.dispatchEvent(new CustomEvent('cart-updated'))
  } catch {
    /* ignore quota errors */
  }
}

class CartService {
  getCart() {
    return readCart()
  }

  addItem(furniture, quantity = 1) {
    if (!furniture) return readCart()
    const current = readCart()
    const targetId = String(furniture.id || furniture.name)
    const idx = current.findIndex((item) => String(item.id) === targetId)

    if (idx > -1) {
      current[idx] = {
        ...current[idx],
        quantity: (Number(current[idx].quantity) || 1) + Number(quantity),
      }
    } else {
      current.push({
        id: furniture.id || furniture.name,
        name: furniture.name,
        category: furniture.category || furniture.type || 'Furnitur',
        material: furniture.material || furniture.caliber || 'Kayu Solid',
        price: Number(furniture.price ?? 0),
        image_url: furniture.image_url || furniture.image || '/furniture/chair.jpg',
        quantity: Number(quantity) || 1,
      })
    }

    writeCart(current)
    return current
  }

  updateQuantity(id, quantity) {
    const current = readCart()
    const targetId = String(id)
    const nextQty = Number(quantity)

    if (nextQty <= 0) {
      return this.removeItem(id)
    }

    const updated = current.map((item) =>
      String(item.id) === targetId ? { ...item, quantity: nextQty } : item,
    )
    writeCart(updated)
    return updated
  }

  removeItem(id) {
    const current = readCart()
    const targetId = String(id)
    const filtered = current.filter((item) => String(item.id) !== targetId)
    writeCart(filtered)
    return filtered
  }

  clearCart() {
    writeCart([])
    return []
  }
}

export default new CartService()
