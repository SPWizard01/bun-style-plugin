import type { OnLoadResult } from "bun";
import { transform, browserslistToTargets } from "lightningcss-wasm"
export type CompileOptions = {
  minify?: boolean;
  cssModules?: boolean;
  targets?: string[];
  processUrlImports?: boolean;
  forwardClassImports?: boolean;
  autoInject?: boolean;
};

export async function compileCSS(content: string, path: string, options: CompileOptions = {}): Promise<OnLoadResult> {
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
  const returnedDependencies = dependencies || [];
  if (urlImports.length > 0) {
    importedUrls += `import { registerStyleImport } from "bun-style-plugin-registry";\n`;
    const importedDeps: string[] = [];
    for (const element of urlImports) {
      const dep = returnedDependencies.find(dp => dp.url === element);
      if (!dep) continue;
      const importFriendlyPlaceholder = dep.placeholder.replace(/(?![a-zA-Z0-9])./g, "_");
      if (importedDeps.includes(importFriendlyPlaceholder)) continue;
      importedDeps.push(importFriendlyPlaceholder);
      importedUrls += `import sdi_${importFriendlyPlaceholder} from "${dep.url}";\n`
      importedUrls += `registerStyleImport("${dep.placeholder}",sdi_${importFriendlyPlaceholder});`
      placehoders += `"${dep.placeholder}",`
    }
  }
  placehoders += `]`;
  let codeString = code.toString();
  for (const element of returnedDependencies) {
    if (urlImports.includes(element.url)) continue;
    const replaceRegexp = new RegExp(`\\(\\"${element.placeholder}\\"\\)`, "g");
    codeString = codeString.replace(replaceRegexp, `("${element.url}")`);
  }
  const needsResolving = returnedDependencies.length > 0; //codeString.includes("[BUN_RESOLVE]");
  const styleResolver = needsResolving ? `import bun_style_plugin_resolver from "bun-style-plugin-resolver";` : "";
  const withResolver = needsResolving ? `bun_style_plugin_resolver(\`${codeString}\`, ${placehoders})` : `\`${codeString}\``;
  const nameMap = Object.fromEntries(Object.entries(exports || {}).map(([key, item]) => [key, item.name]));

  const imported = imports.map((url, i) => `import { css as _css${i}, classes as _classes${i} } from "${url}";`).join("\n");
  const exported = imports.map((_, i) => `_css${i}`).join(" + ");
  let importedClasses = imports.map((_, i) => `_classes${i}`).join(", ...");
  if (!importedClasses) importedClasses = "{}";
  let classExport = JSON.stringify(options.cssModules ? nameMap : {});
  if (importedClasses !== "{}" && options.forwardClassImports) {
    const restExport = classExport.substring(1, classExport.length - 1);
    classExport = `{...${importedClasses}${(restExport ? `, ${restExport}` : ``)}}`;
  }
  let thisCss = `
const thisCss = ${withResolver};
`
let autoInject = ``;
let autoInjectImport = ``;
if(options.autoInject) {
  autoInjectImport = `import { insertStyleElement } from "bun-style-plugin-importer";`
  autoInject = `insertStyleElement(thisCss);`
}

  if (exported) {
    thisCss += `
export const css = ${exported} + thisCss;
`
  } else {
    thisCss += `
export const css = thisCss;
    `
  }

  const exportContent = `
${thisCss};
export const classes = ${classExport};
  `

  let contents = `
${styleResolver}
${importedUrls}
${autoInjectImport}
${imported}
${exportContent}
${autoInject}
  `
  return {
    contents,
    loader: "js"
  };
}