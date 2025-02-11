import type { OnLoadResult } from "bun";
import { transform, browserslistToTargets } from "lightningcss-wasm"
export type CompileOptions = {
  minify?: boolean;
  cssModules?: boolean;
  targets?: string[];
  processUrlImports?: boolean;
};

export default async function compileCSS(content: string, path: string, options: CompileOptions = {}): Promise<OnLoadResult> {
  const imports: string[] = [];
  const urlImports: string[] = [];
  const targets = options.targets?.length ? browserslistToTargets(options.targets) : undefined;
  const { code, exports, dependencies } = transform({
    filename: path,
    code: Uint8Array.from(Buffer.from(content)),
    cssModules: Boolean(options.cssModules),
    minify: options.minify,
    targets,
    analyzeDependencies: true,
    visitor: {
      Rule: {
        import(rule) {
          imports.push(rule.value.url);
          return [];
        },
      },
      Url(urlObject) {
        const lowerUrl = urlObject.url.toLowerCase();
        const isDataOrHttp = lowerUrl.startsWith("data:") || lowerUrl.startsWith("http");
        if (isDataOrHttp || !options.processUrlImports) return urlObject;
        urlImports.push(urlObject.url);
        return urlObject;
      },
    }
  });

  let importedUrls = ``
  let placehoders = `[`;
  if (urlImports.length > 0) {
    const returnedDependencies = dependencies || [];
    importedUrls += `import { registerStyleImport } from "bun-style-plugin-registry";\n`;
    const importedDeps: string[] = [];
    for (const element of urlImports) { 
      const dep = returnedDependencies.find(dp => dp.url === element);
      if(!dep) continue;
      const importFriendlyPlaceholder = dep.placeholder.replace(/(?![a-zA-Z0-9])./g, "_");
      if(importedDeps.includes(importFriendlyPlaceholder)) continue;
      importedDeps.push(importFriendlyPlaceholder); 
      importedUrls += `import sdi_${importFriendlyPlaceholder} from "${dep.url}";`
      importedUrls += `registerStyleImport("${dep.placeholder}",sdi_${importFriendlyPlaceholder});\n`
      placehoders += `"${dep.placeholder}",`
    }
  }
  placehoders += `]`;
  const codeString = code.toString();
  const needsResolving = Array.isArray(dependencies) && dependencies.length > 0; //codeString.includes("[BUN_RESOLVE]");
  const styleResolver = needsResolving ? `import bun_style_plugin_resolver from "bun-style-plugin-resolver";` : "";
  const withResolver = needsResolving ? `bun_style_plugin_resolver(\`${codeString}\`, ${placehoders})` : `\`${codeString}\``;
  const nameMap = Object.fromEntries(Object.entries(exports || {}).map(([key, item]) => [key, item.name]));
  const imported = imports.map((url, i) => `import _css${i} from "${url}";`).join("\n");
  const exported = imports.map((_, i) => `_css${i}`).join(" + ");

  const codeExport = exported ? `${exported} + ${withResolver}` : withResolver;

  const exportContent = options.cssModules ? `
    export const code = ${codeExport};
    export default ${JSON.stringify(nameMap)};
  ` :
    `export default ${codeExport};`;

  let contents = `
    ${styleResolver}
    ${importedUrls}
    ${imported}
    ${exportContent}
  `

  return {
    contents,
    loader: "js",
  };
}