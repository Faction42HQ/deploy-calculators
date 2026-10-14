import * as esbuild from 'esbuild';
import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const serve = process.argv.includes('--serve');

const options = {
  entryPoints: { 'deploy-calcs': 'src/loader.ts' },
  outdir: 'dist',
  bundle: true,
  splitting: true,
  format: 'esm',
  target: ['es2020'],
  minify: !serve,
  sourcemap: serve ? 'inline' : false,
  chunkNames: 'chunks/[name]-[hash]',
  legalComments: 'none',
  logLevel: 'info',
};

if (serve) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: '.', port: Number(process.env.PORT) || 5173 });
  console.log(`\nDemo: http://localhost:${port}/demo/\n`);
} else {
  rmSync('dist', { recursive: true, force: true }); // drop stale dev-server chunks
  await esbuild.build({ ...options, metafile: true });
  // Single-file build for Webflow's script manager, which requires an SRI hash.
  // SRI on an ES module entry doesn't cover its imported chunks reliably, so this file has none.
  await esbuild.build({
    ...options,
    entryPoints: { 'deploy-calcs.bundle': 'src/loader.ts' },
    splitting: false,
    format: 'iife',
    define: { 'import.meta.url': '""' },
  });
  // Size report: what a visitor downloads (gzipped).
  const files = [];
  const walk = (d) => readdirSync(d).forEach((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : files.push(join(d, f))));
  walk('dist');
  let total = 0;
  for (const f of files.filter((f) => f.endsWith('.js')).sort()) {
    const gz = gzipSync(readFileSync(f)).length;
    total += gz;
    console.log(`${(gz / 1024).toFixed(1).padStart(6)} KB gz  ${f}`);
  }
  console.log(`${(total / 1024).toFixed(1).padStart(6)} KB gz  total (a page loads the loader + shared chunk + its calculator)`);
}
