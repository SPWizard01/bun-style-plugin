import { styleLoader } from 'bun-scss-loader';

Bun.build({
  entrypoints: ['./index.js'],
  outdir: './dist',
  plugins: [styleLoader()],
});
