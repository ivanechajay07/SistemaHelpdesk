import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = decodeURIComponent(
  new URL('../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
);
const TARGETS = ['src', 'index.html'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.css', '.html', '.json', '.md']);
const MARKERS = ['\uFEFF', '\u00C3', '\u00C2', '\u00E2\u20AC', '\uFFFD'];

/** Devuelve los problemas de codificación de un texto. */
function inspect(text) {
  const problems = [];
  for (const marker of MARKERS) {
    if (text.includes(marker)) {
      problems.push(
        marker === '\uFEFF'
          ? 'BOM UTF-8 al inicio (usar UTF-8 sin BOM)'
          : `texto doblemente codificado (${JSON.stringify(marker)})`,
      );
    }
  }
  return problems;
}

function walk(path, files = []) {
  const stats = statSync(path);
  if (stats.isFile()) {
    if (EXTENSIONS.has(path.slice(path.lastIndexOf('.')))) files.push(path);
    return files;
  }
  for (const entry of readdirSync(path)) {
    if (entry === 'node_modules' || entry === 'dist') continue;
    walk(join(path, entry), files);
  }
  return files;
}

const errors = [];
for (const target of TARGETS) {
  const absolute = join(ROOT, target);
  for (const file of walk(absolute)) {
    const text = readFileSync(file, 'utf8');
    const problems = inspect(text);
    if (problems.length > 0) {
      errors.push(`${relative(ROOT, file)}: ${problems.join(', ')}`);
    }
  }
}

if (errors.length > 0) {
  console.error('Se detectaron problemas de codificación:');
  for (const error of errors) console.error(`  - ${error}`);
  console.error('\nGuarda los archivos como UTF-8 sin BOM y evita Get-Content/Set-Content con codificación ANSI.');
  process.exit(1);
}

console.log('Codificación UTF-8 correcta.');
