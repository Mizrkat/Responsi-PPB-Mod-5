import { useState } from 'react'
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  MessageCircle,
  CheckCircle,
} from 'lucide-react'
import { useCart } from '../hooks/useCart'
import { getUserProfile } from '../services/userService'
import { formatPrice, buildWhatsAppOrderUrl } from '../utils/helpers'

export default function CartPage({ onNavigateCatalog }) {
  const { cartItems, totalCount, totalPrice, updateQuantity, removeFromCart, clearCart } = useCart()
  const profile = getUserProfile()

  const [buyerName, setBuyerName] = useState(profile.username || '')
  const [buyerAddress, setBuyerAddress] = useState('')
  const [buyerNotes, setBuyerNotes] = useState('')
  const [checkedOutOrder, setCheckedOutOrder] = useState(null)

  const handleCheckoutSubmit = (e) => {
    e.preventDefault()
    if (cartItems.length === 0) return

    const waUrl = buildWhatsAppOrderUrl(cartItems, {
      name: buyerName.trim(),
      address: buyerAddress.trim(),
      notes: buyerNotes.trim(),
    })

    const orderSnapshot = {
      items: [...cartItems],
      totalPrice,
      buyerName: buyerName.trim(),
      buyerAddress: buyerAddress.trim(),
      buyerNotes: buyerNotes.trim(),
      waUrl,
    }

    setCheckedOutOrder(orderSnapshot)
    clearCart()
    window.open(waUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="page">
      <section className="masthead" style={{ paddingTop: 12 }}>
        <h1 className="display">Keranjang &amp; Checkout</h1>
        <p className="lede">
          Periksa kembali furnitur pilihan Anda sebelum melanjutkan pemesanan dan konfirmasi pengiriman melalui WhatsApp.
        </p>
      </section>

      {/* Checkout Success & WhatsApp Confirmation State */}
      {checkedOutOrder && (
        <div
          className="card-box"
          style={{
            marginTop: 24,
            borderColor: '#1e8449',
            background: '#f4fbf7',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <CheckCircle size={26} color="#1e8449" />
            <h2 className="card-box-title" style={{ margin: 0, color: '#1e8449' }}>
              Pesanan Berhasil Dibuat!
            </h2>
          </div>
          <p style={{ margin: '0 0 14px', color: 'var(--ink)', lineHeight: 1.5 }}>
            Terima kasih, <strong>{checkedOutOrder.buyerName || 'Pelanggan'}</strong>. Pesanan Anda untuk{' '}
            <strong>
              {checkedOutOrder.items
                .map((i) => `${i.name} (${i.quantity}x)`)
                .join(', ')}
            </strong>{' '}
            senilai <strong>{formatPrice(checkedOutOrder.totalPrice)}</strong> siap dikonfirmasi melalui WhatsApp kami di nomor{' '}
            <strong>08871979070</strong>.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a
              href={checkedOutOrder.waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--primary"
              style={{ background: '#1e8449', borderColor: '#1e8449' }}
            >
              <MessageCircle size={18} /> Chat WhatsApp Sekarang (08871979070)
            </a>
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => {
                setCheckedOutOrder(null)
                if (onNavigateCatalog) onNavigateCatalog()
              }}
            >
              Kembali Belanja
            </button>
          </div>
        </div>
      )}

      {cartItems.length === 0 && !checkedOutOrder ? (
        <div className="state-box" style={{ marginTop: 28 }}>
          <ShoppingBag size={40} stroke="var(--steel)" />
          <h3>Keranjang Belanja Anda Masih Kosong</h3>
          <p className="lede">
            Temukan kursi santai, meja makan kayu solid, atau sofa pilihan di halaman Katalog lalu tambahkan ke keranjang.
          </p>
          {onNavigateCatalog && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={onNavigateCatalog}
              style={{ marginTop: 12 }}
            >
              Jelajahi Katalog Furnitur <ArrowRight size={16} />
            </button>
          )}
        </div>
      ) : (
        cartItems.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 24,
              marginTop: 24,
              alignItems: 'start',
            }}
          >
            {/* Daftar Barang di Keranjang */}
            <div className="card-box" style={{ marginBottom: 0 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                  paddingBottom: 10,
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <h2 className="card-box-title" style={{ margin: 0 }}>
                  Daftar Pesanan ({totalCount} Barang)
                </h2>
                <button
                  type="button"
                  className="btn btn--danger-ghost btn--sm"
                  onClick={clearCart}
                >
                  Kosongkan Keranjang
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      gap: 14,
                      paddingBottom: 14,
                      borderBottom: '1px solid var(--line)',
                      alignItems: 'center',
                    }}
                  >
                    <img
                      src={item.image_url || '/furniture/chair.jpg'}
                      alt={item.name}
                      style={{
                        width: 76,
                        height: 76,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '1px solid var(--line)',
                        flexShrink: 0,
                      }}
                    />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ margin: '0 0 4px', fontSize: '1rem' }}>{item.name}</h4>
                      <p style={{ margin: '0 0 6px', fontSize: '0.8rem', color: 'var(--steel)' }}>
                        {item.category} · {item.material}
                      </p>
                      <div style={{ fontWeight: 700, color: 'var(--brass)', fontSize: '0.95rem' }}>
                        {formatPrice(item.price)}
                      </div>
                    </div>

                    {/* Pengatur Jumlah */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => updateQuantity(item.id, (Number(item.quantity) || 1) - 1)}
                        aria-label="Kurangi jumlah"
                      >
                        <Minus size={14} />
                      </button>
                      <span style={{ fontWeight: 700, minWidth: 22, textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => updateQuantity(item.id, (Number(item.quantity) || 1) + 1)}
                        aria-label="Tambah jumlah"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger-ghost"
                        onClick={() => removeFromCart(item.id)}
                        title="Hapus dari keranjang"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Checkout & Ringkasan Pembayaran */}
            <form onSubmit={handleCheckoutSubmit} className="card-box" style={{ marginBottom: 0 }}>
              <h2 className="card-box-title" style={{ marginBottom: 14 }}>
                Detail Pengiriman &amp; Checkout
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Nama Lengkap Penerima *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Masukkan nama lengkap penerima"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Alamat Lengkap Pengiriman *</label>
                  <textarea
                    rows={3}
                    className="form-textarea"
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                    placeholder="Nama jalan, nomor rumah, kecamatan, kota, dan kode pos..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Catatan Pesanan (Opsional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={buyerNotes}
                    onChange={(e) => setBuyerNotes(e.target.value)}
                    placeholder="Contoh: Warna kain, jadwal pengiriman..."
                  />
                </div>

                <div
                  style={{
                    background: 'var(--paper)',
                    padding: 16,
                    borderRadius: 8,
                    border: '1px solid var(--line)',
                    marginTop: 6,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                      fontSize: '0.9rem',
                      color: 'var(--steel)',
                    }}
                  >
                    <span>Total Barang ({totalCount} Unit)</span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                      fontSize: '0.9rem',
                      color: 'var(--steel)',
                    }}
                  >
                    <span>Pengiriman &amp; Asuransi</span>
                    <span style={{ color: '#1e8449', fontWeight: 600 }}>Gratis Ongkir Jawa</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: 10,
                      borderTop: '1px solid var(--line)',
                      fontWeight: 700,
                      fontSize: '1.15rem',
                    }}
                  >
                    <span>Total Pembayaran</span>
                    <span style={{ color: 'var(--brass)' }}>{formatPrice(totalPrice)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn--primary"
                  style={{
                    width: '100%',
                    marginTop: 8,
                    background: '#1e8449',
                    borderColor: '#1e8449',
                  }}
                >
                  <MessageCircle size={18} /> Checkout &amp; Pesan via WhatsApp
                </button>
                <span style={{ fontSize: '0.78rem', color: 'var(--steel)', textAlign: 'center' }}>
                  Setelah klik Checkout, Anda akan diarahkan ke WhatsApp <strong>08871979070</strong> dengan daftar barang pesanan Anda.
                </span>
              </div>
            </form>
          </div>
        )
      )}
    </div>
  )
}
