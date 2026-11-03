// ---------------------------------------------------------------------------
// Data Katalog Awal — Kayu & Ruang Artisan Furniture Studio
// Digunakan sebagai initial seed & offline fallback catalog
// ---------------------------------------------------------------------------
const FURNITURES_LOCAL = [
  {
    id: 'furn-101',
    name: 'Kursi Santai Jati Jepara Bouclé',
    type: 'Kursi',
    category: 'Kursi',
    caliber: 'Kayu Jati Solid Grade A & Kain Bouclé Cream',
    difficulty: 'sulit',
    price: 3850000,
    is_featured: true,
    image_url: '/furniture/chair.jpg',
    image: '/furniture/chair.jpg',
    description:
      'Kursi lounge bergaya Mid-Century Modern dengan rangka kayu jati TPK Perhutani bersertifikat. Dilengkapi bantalan busa high-density berlapis kain bouclé lembut yang ergonomis untuk sudut baca maupun ruang tamu.',
    ingredients: [
      { id: 'sp-1', name: 'Dimensi (P x L x T)', quantity: '74 x 82 x 78 cm' },
      { id: 'sp-2', name: 'Material Rangka', quantity: 'Kayu Jati Solid Tua (Kiln-Dried)' },
      { id: 'sp-3', name: 'Finishing Kayu', quantity: 'Natural Matte Teak Oil Waterbased' },
      { id: 'sp-4', name: 'Beban Maksimum', quantity: '150 kg' },
    ],
    steps: [
      'Pasang keempat kaki miring ke rangka dudukan utama menggunakan baut L baja tahan karat yang disertakan.',
      'Kencangkan sambungan mortise-and-tenon secara menyilang hingga presisi.',
      'Letakkan bantal dudukan dan sandaran bouclé, lalu bersihkan permukaan kayu dengan kain microfiber kering setiap minggu.',
    ],
  },
  {
    id: 'furn-102',
    name: 'Meja Makan Oak Skandinavia 6 Kursi',
    type: 'Meja',
    category: 'Meja',
    caliber: 'Solid White Oak & Anyaman Danish Cord',
    difficulty: 'sedang',
    price: 9450000,
    is_featured: true,
    image_url: '/furniture/table.jpg',
    image: '/furniture/table.jpg',
    description:
      'Set meja makan keluarga berdesain Skandinavia hangat dengan tepian bevel halus dan konstruksi tahan lembab. Cocok untuk ruang makan modern maupun ruang terbuka.',
    ingredients: [
      { id: 'sp-1', name: 'Dimensi Meja', quantity: '180 x 90 x 75 cm' },
      { id: 'sp-2', name: 'Material Utama', quantity: 'Solid White Oak & Jati Pilihan' },
      { id: 'sp-3', name: 'Kapasitas Duduk', quantity: '6 Orang Dewasa' },
      { id: 'sp-4', name: 'Ketebalan Top Table', quantity: '3.2 cm Solid Slab' },
    ],
    steps: [
      'Balikkan daun meja di atas alas karpet lembut agar permukaan bebas goresan saat instalasi.',
      'Pasang keempat kaki silinder meruncing pada bracket sudut kayu dan putar mur pengunci.',
      'Oleskan beeswax polish setiap 6 bulan untuk menjaga kilau serat kayu alami.',
    ],
  },
  {
    id: 'furn-103',
    name: 'Sofa 3-Seater Linen Sage & Rangka Walnut',
    type: 'Sofa',
    category: 'Sofa',
    caliber: 'Kayu Walnut Solid & Linen Beludru Sage',
    difficulty: 'sulit',
    price: 12800000,
    is_featured: true,
    image_url: '/furniture/sofa.jpg',
    image: '/furniture/sofa.jpg',
    description:
      'Sofa 3 dudukan berprofil rendah dengan panel samping kayu walnut utuh dan sarung bantal linen hijau sage yang dapat dilepas-cuci. Menghadirkan kesan tenang dan lapang di ruang keluarga.',
    ingredients: [
      { id: 'sp-1', name: 'Dimensi (P x L x T)', quantity: '220 x 88 x 76 cm' },
      { id: 'sp-2', name: 'Material Rangka', quantity: 'Solid American Walnut & Jati' },
      { id: 'sp-3', name: 'Upholstery', quantity: 'Woven Linen Anti-Noda (Removable Cover)' },
      { id: 'sp-4', name: 'Konstruksi Pegas', quantity: 'Webbing Elastis + Pocket Spring' },
    ],
    steps: [
      'Hubungkan panel sandaran belakang ke kedua panel samping kayu walnut menggunakan pengait interlock.',
      'Pasang dek penopang dudukan dan susun ketiga bantal dudukan serta sandaran punggung.',
      'Vakum debu pada sela kain linen secara berkala dan hindari paparan sinar matahari langsung.',
    ],
  },
  {
    id: 'furn-104',
    name: 'Kabinet Credenza Kisi Kayu Walnut',
    type: 'Kabinet',
    category: 'Kabinet',
    caliber: 'Solid Walnut & Pintu Geser Slatted',
    difficulty: 'sedang',
    price: 6750000,
    is_featured: false,
    image_url: '/furniture/credenza.jpg',
    image: '/furniture/credenza.jpg',
    description:
      'Credenza multifungsi dengan pintu geser kisi-kisi (slatted sliding doors) yang memberikan sirkulasi udara optimal untuk perangkat audio/TV serta 3 laci penyimpanan soft-close.',
    ingredients: [
      { id: 'sp-1', name: 'Dimensi (P x L x T)', quantity: '160 x 45 x 72 cm' },
      { id: 'sp-2', name: 'Sistem Pintu', quantity: '2 Pintu Geser Kisi + 3 Laci Soft-Close' },
      { id: 'sp-3', name: 'Material', quantity: 'Kayu Walnut & Sungkai Solid' },
      { id: 'sp-4', name: 'Lubang Manajemen Kabel', quantity: '2 Port tersembunyi di panel belakang' },
    ],
    steps: [
      'Pasang rangka kaki miring pada bagian bawah bodi kabinet dan pastikan rata menggunakan waterpass.',
      'Masukkan pintu geser ke jalur rel atas dan bawah, lalu atur tinggi rak internal sesuai kebutuhan.',
      'Bersihkan sela kisi-kisi kayu menggunakan kuas halus kering.',
    ],
  },
  {
    id: 'furn-105',
    name: 'Rangka Tempat Tidur Japandi Kayu Jati',
    type: 'Tempat Tidur',
    category: 'Tempat Tidur',
    caliber: 'Kayu Jati Perhutani Queen Size (160x200)',
    difficulty: 'sedang',
    price: 8900000,
    is_featured: true,
    image_url: '/furniture/bed.jpg',
    image: '/furniture/bed.jpg',
    description:
      'Dipan platform bergaya Japandi minimalis dengan headboard miring ergonomis dan sambungan kayu presisi bebas derit. Dirancang untuk sirkulasi udara matras yang sehat.',
    ingredients: [
      { id: 'sp-1', name: 'Ukuran Matras', quantity: 'Queen Size (160 x 200 cm)' },
      { id: 'sp-2', name: 'Dimensi Total', quantity: '212 x 168 x 92 cm' },
      { id: 'sp-3', name: 'Material Slat', quantity: '14 Bilah Kayu Jati Tebal 2 cm' },
      { id: 'sp-4', name: 'Tinggi Kolong', quantity: '22 cm (Mudah dibersihkan robot vacuum)' },
    ],
    steps: [
      'Sambungkan headboard dan footboard dengan kedua side rail menggunakan bracket baja heavy-duty.',
      'Pasang tiang penyangga tengah (center support beam) beserta kaki penopang tambahan.',
      'Susun bilah slat kayu jati secara merata dan kunci dengan sekrup pengaman.',
    ],
  },
  {
    id: 'furn-106',
    name: 'Meja Kerja Eksekutif Kayu Walnut',
    type: 'Meja Kerja',
    category: 'Meja Kerja',
    caliber: 'Solid Walnut & Handle Kuningan (Brass)',
    difficulty: 'mudah',
    price: 5250000,
    is_featured: false,
    image_url: '/furniture/desk.jpg',
    image: '/furniture/desk.jpg',
    description:
      'Meja kerja studio dengan tepi depan miring yang nyaman di pergelangan tangan, dilengkapi 3 laci alat tulis beraksen kenop kuningan asli untuk produktivitas kerja di rumah.',
    ingredients: [
      { id: 'sp-1', name: 'Dimensi (P x L x T)', quantity: '140 x 65 x 75 cm' },
      { id: 'sp-2', name: 'Material', quantity: 'Kayu Walnut Solid & Brass Hardware' },
      { id: 'sp-3', name: 'Jumlah Laci', quantity: '3 Laci Penyimpanan Dokumen & Laptop' },
      { id: 'sp-4', name: 'Finishing', quantity: 'Satin Polyurethane Tahan Gores & Air' },
    ],
    steps: [
      'Pasang keempat kaki meruncing pada sudut bawah meja menggunakan kunci L yang tersedia.',
      'Pastikan laci berjalan mulus pada rel kayu dan pasang kenop kuningan.',
      'Gunakan desk mat kulit atau felt saat bekerja untuk menjaga kehalusan serat permukaan.',
    ],
  },
]

export default FURNITURES_LOCAL
