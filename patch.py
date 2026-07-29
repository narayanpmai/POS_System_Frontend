import os

file_path = 'src/app/purchases/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add searchTerm state
content = content.replace(
    'const [currentPage, setCurrentPage] = useState(1);',
    'const [currentPage, setCurrentPage] = useState(1);\n  const [searchTerm, setSearchTerm] = useState(\'\');'
)

# 2. Add filteredPurchases logic
filter_logic = '''
  const filteredPurchases = purchases.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    if (p.poNumber?.toLowerCase().includes(term)) return true;
    if (p.status?.toLowerCase().includes(term)) return true;
    if (p.items?.some((item: any) => {
       const prodName = products.find(prod => prod.id === item.productId)?.name || '';
       return prodName.toLowerCase().includes(term);
    })) return true;
    return false;
  });

  // Listing view (when showForm is false)
'''
content = content.replace('  // Listing view (when showForm is false)', filter_logic)

# 3. Replace header
old_header = '''      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold m-0">{t('purchases', 'title')}</h4>
        <button className="btn btn-primary fw-bold d-flex align-items-center gap-2 px-3" onClick={() => setShowForm(true)}>
          <i className="bi bi-plus-lg"></i> {t('purchases', 'add_purchase')}
        </button>
      </div>'''

new_header = '''      <div className="d-flex justify-content-between align-items-center mb-4 gap-3 flex-wrap">
        <h4 className="fw-bold m-0">{t('purchases', 'title')}</h4>
        <div className="d-flex gap-3 align-items-center flex-grow-1 justify-content-end" style={{ maxWidth: '600px' }}>
          <div className="input-group">
            <span className="input-group-text bg-white border-end-0"><i className="bi bi-search text-muted"></i></span>
            <input 
              type="text" 
              className="form-control border-start-0 ps-0" 
              placeholder={t('common', 'search') || 'Search purchases...'} 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          <button className="btn btn-primary fw-bold d-flex align-items-center gap-2 px-3 text-nowrap" onClick={() => setShowForm(true)}>
            <i className="bi bi-plus-lg"></i> {t('purchases', 'add_purchase')}
          </button>
        </div>
      </div>'''

content = content.replace(old_header, new_header)

# 4. Replace purchases.map with filteredPurchases.map
content = content.replace(
    'purchases.length === 0 ? (',
    'filteredPurchases.length === 0 ? ('
)
content = content.replace(
    'purchases.map(p => (',
    'filteredPurchases.map(p => ('
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
