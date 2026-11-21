import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = decodeURIComponent(
  new URL('../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
);

const RULES = [
  {
    name: 'Las páginas no deben importar axios directamente',
    dirs: ['src/pages'],
    pattern: /from\s+['"][^'"]*lib\/axios['"]/,
  },
  {
    name: 'Los componentes no deben importar axios directamente',
    dirs: ['src/components'],
    pattern: /from\s+['"][^'"]*lib\/axios['"]/,
  },
  {
    name: 'Los servicios no deben depender de páginas, componentes ni stores',
    dirs: ['src/services'],
    pattern: /from\s+['"][^'"]*(pages|components|store)\//,
  },
];

function walk(path, files = []) {
  const stat = statSync(path);
  if (stat.isFile()) {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) files.push(path);
    return files;
  }
  for (const entry of readdirSync(path)) {
    if (entry === 'node_modules' || entry === 'dist') continue;
    walk(join(path, entry), files);
  }
  return files;
}

const errors = [];
for (const rule of RULES) {
  for (const dir of rule.dirs) {
    for (const file of walk(join(ROOT, dir))) {
      const text = readFileSync(file, 'utf8');
      if (rule.pattern.test(text)) {
        errors.push(`${relative(ROOT, file)}: ${rule.name}`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Se detectaron violaciones de capas en el frontend:');
  for (const error of errors) console.error(`  - ${error}`);
  console.error('\nUsa src/services para los casos de uso y deja axios solo en la capa de infraestructura.');
  process.exit(1);
}

console.log('Capas del frontend correctas.');
