import { $, build } from "bun";

await $`rm -rf dist`;

await build({
    entrypoints: ["./src/index.ts", "./src/assetResolver.ts", "./src/importRegistry.ts", "./src/styleAssetResolver.ts", "./src/utils.ts"],
    outdir: "./dist",
    target: "bun",
    minify: false,
    splitting: false,
    format: "esm",
    external: ["sass", "sass-embedded", "lightningcss", "lightningcss-wasm", "bun-style-plugin-registry"]
});

await $`tsc`