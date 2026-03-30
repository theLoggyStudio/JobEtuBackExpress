/**
 * Optionnel : obfuscation du JS compilé après `tsc`.
 */
import JavaScriptObfuscator from 'javascript-obfuscator';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, '..', 'dist');

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}

if (!fs.existsSync(dist)) {
  console.warn('Dossier dist absent — lancez npm run build d’abord.');
  process.exit(0);
}

for (const full of walk(dist)) {
  const code = fs.readFileSync(full, 'utf8');
  const ob = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    debugProtection: false,
    selfDefending: false,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    transformObjectKeys: false,
  });
  fs.writeFileSync(full, ob.getObfuscatedCode());
  console.log('Obfusqué:', path.relative(dist, full));
}
