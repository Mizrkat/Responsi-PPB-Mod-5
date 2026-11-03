import { Search, SlidersHorizontal } from 'lucide-react'

export default function AdvancedFilter({
  search,
  onSearch,
  categories,
  activeCategory,
  onCategory,
  sortKey,
  sortOrder,
  onSort,
}) {
  return (
    <div className="adv-filter">
      <div className="adv-filter__search">
        <Search size={16} className="adv-filter__icon" />
        <input
          type="search"
          placeholder="Cari nama furniture, material kayu (Jati, Walnut, Oak)…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="adv-filter__input"
          aria-label="Cari produk furniture"
        />
      </div>

      <div className="adv-filter__pills">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`pill${activeCategory === cat ? ' pill--active' : ''}`}
            onClick={() => onCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="adv-filter__sort">
        <SlidersHorizontal size={14} />
        <span>Urutkan:</span>
        <select
          value={`${sortKey}_${sortOrder}`}
          onChange={(e) => {
            const [key, order] = e.target.value.split('_')
            onSort({ key, order })
          }}
          aria-label="Urutkan produk"
          className="adv-filter__select"
        >
          <option value="name_asc">Nama A → Z</option>
          <option value="name_desc">Nama Z → A</option>
          <option value="price_asc">Harga Terendah → Tertinggi</option>
          <option value="price_desc">Harga Tertinggi → Terendah</option>
        </select>
      </div>
    </div>
  )
}
