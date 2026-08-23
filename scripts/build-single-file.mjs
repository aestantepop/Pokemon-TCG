#!/usr/bin/env node
/**
 * Gera binder.html: o app inteiro num arquivo so.
 *
 * Motivo: a versao em varios arquivos precisa de um servidor local, porque o
 * navegador bloqueia `fetch` e modulos ES em paginas abertas por `file://`.
 * Aqui o CSS, o JavaScript e os dados das cartas viram um unico HTML que abre
 * com dois cliques, sem instalar nada.
 *
 * O empacotamento e proposital e simples: os modulos nao tem dependencias
 * externas nem nomes repetidos entre si, entao basta concatena-los na ordem de
 * dependencia, remover as linhas de `import`/`export` e envolver tudo numa IIFE
 * em um `<script>` classico (modulo nem inline funciona em `file://`).
 *
 * Uso: npm run build:html
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(resolve(root, rel), 'utf8');

/** Ordem de dependencia dos modulos. */
const MODULES = [
  'js/labels.js',
  'js/load-json.js',
  'js/store.js',
  'js/enrich.js',
  'js/prices.js',
  'js/print.js',
  'js/app.js',
];

/** JSONs embutidos na pagina, na chave que o app usa para pedi-los. */
const DATA_FILES = ['data/sets.json', 'data/sv08-surging-sparks.json'];

/** Nomes exportados por store.js, para recriar o `import * as store`. */
const STORE_NAMESPACE = [
  'variantsOf', 'onChange', 'entry', 'qty', 'totalQty', 'hasCard', 'hasFoil',
  'setQty', 'bump', 'resetSet', 'exportBackup', 'importBackup', 'getSettings',
  'updateSettings', 'progress',
];

/** Remove `import ...;` e o prefixo `export ` de um modulo. */
function stripModuleSyntax(source) {
  return source
    .replace(/^import\s[^;]*;\s*$/gm, '')
    .replace(/^export\s+(?=(async\s+)?(function|const|let|class))/gm, '')
    .replace(/^export\s+\{[^}]*\};\s*$/gm, '');
}

const inlineData = {};
for (const path of DATA_FILES) inlineData[path] = JSON.parse(read(path));

const bundle = [];
for (const path of MODULES) {
  bundle.push(`\n/* ===== ${path} ===== */\n`);
  bundle.push(stripModuleSyntax(read(path)).trim());
  bundle.push('\n');
  if (path === 'js/store.js') {
    // app.js usa `store.qty(...)`; recria esse agrupamento sem modulos.
    bundle.push(`\nconst store = { ${STORE_NAMESPACE.join(', ')} };\n`);
  }
  if (path === 'js/load-json.js') {
    // Sobrescreve o carregador: os dados ja estao na pagina.
    bundle.push('\nloadJson = async (path) => {\n'
      + '  if (path in EMBEDDED_DATA) return structuredClone(EMBEDDED_DATA[path]);\n'
      + '  throw new Error(`${path} não está embutido nesta versão.`);\n'
      + '};\n');
  }
}

// `loadJson` precisa virar `let` para poder ser substituido acima.
const script = bundle.join('').replace(
  /^async function loadJson\(/m,
  'let loadJson = async function loadJson(',
).replace(
  /^\}\n(?=\n?\nloadJson = async)/m,
  '};\n',
);

const html = read('index.html')
  .replace(
    '<link rel="stylesheet" href="css/styles.css">',
    `<style>\n${read('css/styles.css')}\n</style>`,
  )
  .replace(
    '<script type="module" src="js/app.js"></script>',
    '<script>\n(function () {\n"use strict";\n'
    + `const EMBEDDED_DATA = ${JSON.stringify(inlineData)};\n`
    + `${script}\n})();\n</script>`,
  )
  .replace(
    '<title>Binder — Organizador de cartas Pokémon</title>',
    '<title>Binder — Organizador de cartas Pokémon</title>\n'
    + '<!-- Arquivo único gerado por scripts/build-single-file.mjs. Não edite à mão: '
    + 'mexa nos arquivos de js/ e css/ e rode `npm run build:html`. -->',
  );

const OUT = resolve(root, 'binder.html');
writeFileSync(OUT, html);
console.log(`${OUT}: ${(html.length / 1024).toFixed(0)} KB`);
