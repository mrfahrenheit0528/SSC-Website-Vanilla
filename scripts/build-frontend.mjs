import { build } from 'esbuild';
await build({
  entryPoints: ['assets/js/siklab-scene.mjs'],
  outfile: 'assets/js/siklab-scene.bundle.js',
  bundle: true,
  minify: true,
  format: 'esm',
  target: ['es2020'],
  legalComments: 'eof',
  logLevel: 'info',
});
