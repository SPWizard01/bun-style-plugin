import { styleLoader } from 'bun-style-plugin';

Bun.build({
  entrypoints: ['./index.js'],
  outdir: './dist',
  plugins: [styleLoader()],
});
