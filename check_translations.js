const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const localesDir = path.join(srcDir, 'locales');
const enLocales = path.join(localesDir, 'en');

const missingKeys = {};

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return {};
  }
}

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const regex = /t\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        const ns = match[1];
        const key = match[2];
        
        const jsonPath = path.join(enLocales, ns + '.json');
        if (fs.existsSync(jsonPath)) {
          const dict = readJson(jsonPath);
          if (!dict[key]) {
            if (!missingKeys[ns]) missingKeys[ns] = new Set();
            missingKeys[ns].add(key);
          }
        } else {
           if (!missingKeys[ns]) missingKeys[ns] = new Set();
           missingKeys[ns].add(key);
        }
      }
    }
  }
}

scanDir(srcDir);

for (const ns in missingKeys) {
  console.log(`Missing in ${ns}:`, Array.from(missingKeys[ns]));
}
