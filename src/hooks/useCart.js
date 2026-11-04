import { useState, useEffect, useCallback, useMemo } from 'react'
import cartService, { readCart } from '../services/cartService'

export function useCart() {
  const [cartItems, setCartItems] = useState(() => readCart())

  const refreshCart = useCallback(() => {
    setCartItems(readCart())
  }, [])

  useEffect(() => {
    window.addEventListener('cart-updated', refreshCart)
    return () => window.removeEventListener('cart-updated', refreshCart)
  }, [refreshCart])

  const addToCart = useCallback((furniture, qty = 1) => {
    const next = cartService.addItem(furniture, qty)
    setCartItems([...next])
  }, [])

  const updateQuantity = useCallback((id, qty) => {
    const next = cartService.updateQuantity(id, qty)
    setCartItems([...next])
  }, [])

  const removeFromCart = useCallback((id) => {
    const next = cartService.removeItem(id)
    setCartItems([...next])
  }, [])

  const clearCart = useCallback(() => {
    cartService.clearCart()
    setCartItems([])
  }, [])

  const totalCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0),
    [cartItems],
  )

  const totalPrice = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0,
      ),
    [cartItems],
  )

  return {
    cartItems,
    totalCount,
    totalPrice,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  }
}
