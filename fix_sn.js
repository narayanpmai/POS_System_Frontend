const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  let files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    }
    else {
      if(file.endsWith('.tsx')) {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const files = walkSync('src/app');
let modifiedCount = 0;
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;

  // Change table header ID to S.N.
  const oldHeader = "{t('common', 'id') || 'ID'}";
  const newHeader = "{t('common', 'sn') || 'S.N.'}";
  if (content.includes(oldHeader)) {
    content = content.split(oldHeader).join(newHeader);
    changed = true;
  }
  
  if (content.includes("<th>ID</th>")) {
    content = content.split("<th>ID</th>").join("<th>S.N.</th>");
    changed = true;
  }

  // Find map loops and variable names
  const mapRegex = /applyPagination\(([^,]+),\s*([^,]+),\s*([^)]+)\)\.map\(\(([^,)]+)\)\s*=>/g;
  if(mapRegex.test(content)) {
    content = content.replace(mapRegex, (match, arr, cp, rp, item) => {
      if (item.includes('index')) return match;
      return `applyPagination(${arr}, ${cp}, ${rp}).map((${item}, index) =>`;
    });
    changed = true;
  }
  
  const mapRegex2 = /applyPagination\(([^,]+),\s*([^,]+),\s*([^)]+)\)\.map\(([^,)(]+)\s*=>/g;
  if(mapRegex2.test(content)) {
    content = content.replace(mapRegex2, (match, arr, cp, rp, item) => {
      if (item.includes('index')) return match;
      return `applyPagination(${arr}, ${cp}, ${rp}).map((${item}, index) =>`;
    });
    changed = true;
  }

  // Find {item.id} inside <td> and replace it with formula.
  // We need to match <td ...>{item.id}</td> or similar.
  // It's safer to use regex that extracts the item name from the map function
  // and replaces {item.id} where item is the map variable.
  
  const matches = [...content.matchAll(/applyPagination\(([^,]+),\s*([^,]+),\s*([^)]+)\)\.map\(\(([^,)]+)(?:,\s*index)?\)\s*=>/g)];
  for (const match of matches) {
    const cp = match[2];
    const rp = match[3];
    const item = match[4].trim();
    
    // Replace {item.id} with SN calculation if it exists as the first column.
    // E.g., <td className="..."> {supp.id} </td>
    const idRegex = new RegExp(`>\\s*{\\s*${item}\\.id\\s*}\\s*<\\/td>`, 'g');
    if (idRegex.test(content)) {
      content = content.replace(idRegex, `>{(${cp} - 1) * ${rp} + index + 1}</td>`);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(f, content);
    modifiedCount++;
    console.log(`Modified: ${f}`);
  }
});
console.log(`Done mapping. Modified ${modifiedCount} files.`);
