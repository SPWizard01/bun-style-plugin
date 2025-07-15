import { styleLoader } from 'bun-style-plugin';

Bun.build({
  entrypoints: ['./index.js'],
  outdir: './dist',
  plugins: [styleLoader({ cssModules: true, autoInject: true, addDefaultExport: true, forwardClassImports: true })],
});
