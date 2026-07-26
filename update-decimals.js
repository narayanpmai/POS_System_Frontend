const fs = require('fs');
const path = require('path');

const walk = (dir, done) => {
  let results = [];
  fs.readdir(dir, (err, list) => {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(file => {
      file = path.resolve(dir, file);
      fs.stat(file, (err, stat) => {
        if (stat && stat.isDirectory()) {
          walk(file, (err, res) => {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
          }
          if (!--pending) done(null, results);
        }
      });
    });
  });
};

walk('C:/inetpub/wwwroot/SmartPOS/frontend/src/app', (err, files) => {
  if (err) throw err;
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Replace parseInt(e.target.value) with parseFloat(e.target.value) for qty/quantity
    if (content.includes('parseInt(e.target.value)')) {
      content = content.replace(/parseInt\(e\.target\.value\)/g, 'parseFloat(e.target.value)');
      changed = true;
    }
    
    // For specific inputs, add step="any"
    if (content.includes('type="number"')) {
       content = content.replace(/type="number"\s+min="(\d+)"/g, 'type="number" min="0" step="any"');
       content = content.replace(/type="number"\s+className/g, 'type="number" step="any" className');
       changed = true;
    }

    if (changed) {
      fs.writeFileSync(file, content);
      console.log('Updated', file);
    }
  });
});
