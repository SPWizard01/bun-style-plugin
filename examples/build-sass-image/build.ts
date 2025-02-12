import { styleLoader } from "bun-style-plugin"
import {NodePackageImporter} from "sass";

await Bun.build({
  entrypoints: ['./index.ts'],
  outdir: './dist',
  sourcemap: "none",
  target: "browser",
  plugins: [styleLoader({
    processUrlImports: true,
    useSassEmbedded: true,
    cssModules: true,
    forwardClassImports: true,
    autoInject: true,
    sassCompilerOptions: {
      loadPaths: ["node_modules"],
      silenceDeprecations: ["import", "global-builtin"]
    }
    // precompile(src, path) {
    //   const a = src.replace(/(url\(['"]?)(\.\.?\/)([^'")]+['"]?\))/g, `$1${import.meta.dir}/$2$3`)
    //   console.log(src)
    //   // console.log(path)
    //   return src
    // }
  })],
})
