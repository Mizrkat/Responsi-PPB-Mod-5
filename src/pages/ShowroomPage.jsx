import { MapPin, Clock, Phone, ShieldCheck, Hammer, Sparkles } from 'lucide-react'

export default function ShowroomPage() {
  return (
    <div className="page">
      <h1 className="display">Showroom &amp; Workshop Kayu &amp; Ruang</h1>
      <p className="lede" style={{ marginBottom: 28 }}>
        Setiap kursi, meja makan, dan credenza dirakit dari kayu solid bersertifikat SVLK
        dengan konstruksi tanggam (mortise &amp; tenon) yang dirancang bertahan lintas generasi.
      </p>

      <div className="form-grid" style={{ marginBottom: 24 }}>
        <div className="card-box" style={{ marginBottom: 0 }}>
          <h3 className="card-box-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} color="var(--brass)" /> Galeri Semarang
          </h3>
          <p className="card-box-desc" style={{ marginBottom: 8 }}>
            Jl. Pemuda No. 118, Sekayu, Kec. Semarang Tengah, Kota Semarang, Jawa Tengah 50132
          </p>
          <p style={{ fontSize: '0.88rem', color: 'var(--steel)', margin: 0 }}>
            <Clock size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Selasa – Minggu: 09.00 – 20.00 WIB
          </p>
        </div>

        <div className="card-box" style={{ marginBottom: 0 }}>
          <h3 className="card-box-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Hammer size={18} color="var(--brass)" /> Workshop Produksi Jepara
          </h3>
          <p className="card-box-desc" style={{ marginBottom: 8 }}>
            Kawasan Industri Kriya Kayu Tahunan, Kab. Jepara, Jawa Tengah
          </p>
          <p style={{ fontSize: '0.88rem', color: 'var(--steel)', margin: 0 }}>
            <Phone size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Konsultasi Custom Interior: (024) 358-4410
          </p>
        </div>
      </div>

      <div className="card-box">
        <h3 className="card-box-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} color="var(--brass)" /> Keunggulan Aplikasi PWA Kayu &amp; Ruang
        </h3>
        <ul className="detail-specs" style={{ marginTop: 14 }}>
          <li>
            <strong>Installable Web App:</strong> Dapat di-install ke Home Screen Android, iOS, maupun Desktop layaknya aplikasi native.
          </li>
          <li>
            <strong>Offline-First Architecture:</strong> Service Worker Workbox &amp; LocalStorage menjaga katalog dan CRUD tetap berjalan tanpa sinyal internet.
          </li>
          <li>
            <strong>Full CRUD Fungsional:</strong> Tambah produk furniture baru, unggah foto, edit spesifikasi dimensi, dan hapus item secara interaktif.
          </li>
          <li>
            <strong>Auto-Save Drafts:</strong> Formulir penambahan produk otomatis menyimpan draft setiap 30 detik agar data tidak hilang.
          </li>
        </ul>
      </div>
    </div>
  )
}
