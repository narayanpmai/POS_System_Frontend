const fs = require('fs');
let file = 'src/app/customers/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "<th>{t('customer', 'customer_name')}</th>",
  "<th>{t('common', 'sn') || 'S.N.'}</th>\n                <th>{t('customer', 'customer_name')}</th>"
);

content = content.replace(
  "customers.map((cust) => (",
  "customers.map((cust, index) => ("
);

content = content.replace(
  "<tr key={cust.id}>\n                    <td className=\"fw-bold text-dark\">{cust.name}</td>",
  "<tr key={cust.id}>\n                    <td>{index + 1}</td>\n                    <td className=\"fw-bold text-dark\">{cust.name}</td>"
);

content = content.replace(
  "colSpan={6}",
  "colSpan={7}"
);

content = content.replace(
  "colSpan={6}",
  "colSpan={7}"
);

fs.writeFileSync(file, content);
console.log('Fixed customers');
