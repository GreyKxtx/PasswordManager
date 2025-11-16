const fs = require('fs');
const path = require('path');

const files = ['argon2.js', '_u64.js', 'blake2.js', '_blake.js', '_md.js', 'utils.js'];

if (!fs.existsSync('dist/shared')) {
  fs.mkdirSync('dist/shared', { recursive: true });
}

files.forEach(f => {
  const src = `node_modules/@noble/hashes/esm/${f}`;
  if (fs.existsSync(src)) {
    if (f === 'utils.js') {
      let content = fs.readFileSync(src, 'utf8');
      content = content.replace(/from '@noble\/hashes\/crypto'/g, "from './crypto-noble.js'");
      fs.writeFileSync('dist/shared/utils.js', content);
    } else {
      fs.copyFileSync(src, `dist/shared/${f}`);
    }
  }
});

const cryptoSrc = 'node_modules/@noble/hashes/esm/crypto.js';
if (fs.existsSync(cryptoSrc) && !fs.existsSync('dist/shared/crypto-noble.js')) {
  fs.copyFileSync(cryptoSrc, 'dist/shared/crypto-noble.js');
}

console.log('Argon2 files copied successfully');

