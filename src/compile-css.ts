import type { OnLoadResult } from "bun";
import { browserslistToTargets, transform } from "lightningcss";
export type CompileOptions = {
  minify?: boolean;
  cssModules?: boolean;
  targets?: string[];
  processUrlImports?: boolean;
  forwardClassImports?: boolean;
  autoInject?: boolean;
  outputCss?: boolean;
};

export async function compileCSS(
  content: string,
  path: string,
  options: CompileOptions = {},
): Promise<OnLoadResult> {
  const imports: string[] = [];
  const urlImports: string[] = [];
  const externalImports: string[] = [];
  const targets = options.targets?.length
    ? browserslistToTargets(options.targets)
    : undefined;
  const { code, exports, dependencies } = transform({
    filename: path,
    code: Uint8Array.from(Buffer.from(content)),
    cssModules: Boolean(options.cssModules),
    minify: options.minify,
    targets,
    analyzeDependencies: true && !options.outputCss,
    visitor: {
      Rule: {
        import(rule) {
          const lowerUrl = rule.value.url.toLowerCase();
          const isDataOrHttp =
            lowerUrl.startsWith("data:") || lowerUrl.startsWith("http");
          if (isDataOrHttp || !options.processUrlImports) {
            externalImports.push(rule.value.url);
            return [];
          }
          imports.push(rule.value.url);
          return [];
        },
      },
      Url(urlObject) {
        const lowerUrl = urlObject.url.toLowerCase();
        const isDataOrHttp =
          lowerUrl.startsWith("data:") || lowerUrl.startsWith("http");
        if (isDataOrHttp || !options.processUrlImports) return urlObject;
        urlImports.push(urlObject.url);
        return urlObject;
      },
    },
  });

  let importedUrls = `const resolverPlaceholders = [];\n`;
  const returnedDependencies = (dependencies || []).filter(
    (d) => d.type !== "glob" && d.type !== "file",
  );
  const globOrFileDependencies = (dependencies || []).filter(
    (d) => d.type === "glob" || d.type === "file",
  );
  if (globOrFileDependencies.length > 0) {
    console.warn(
      "Warning: Detected file or glob dependencies in CSS. These are not currently supported by bun-style-plugin and will be ignored. Affected dependencies:",
      globOrFileDependencies,
    );
  }
  if (urlImports.length > 0) {
    importedUrls += `import { registerStyleImport } from "bun-style-plugin-registry";\n`;
    const importedDeps: string[] = [];
    for (const element of urlImports) {
      const dep = returnedDependencies.find((dp) => dp.url === element);
      if (!dep) continue;
      const importFriendlyPlaceholder = dep.placeholder.replace(
        /(?![a-zA-Z0-9])./g,
        "_",
      );
      if (importedDeps.includes(importFriendlyPlaceholder)) continue;
      importedDeps.push(importFriendlyPlaceholder);
      importedUrls += `import sdi_${importFriendlyPlaceholder} from "${dep.url}";\n`;
      importedUrls += `resolverPlaceholders.push(registerStyleImport("${dep.placeholder}",sdi_${importFriendlyPlaceholder}));`;
    }
  }
  let codeString = code.toString();
  for (const element of returnedDependencies) {
    if (urlImports.includes(element.url)) continue;
    const replaceRegexp = new RegExp(`\\(\\"${element.placeholder}\\"\\)`, "g");
    codeString = codeString.replace(replaceRegexp, `("${element.url}")`);
  }

  for (const external of externalImports.reverse()) {
    codeString = `@import "${external}"; ${codeString}`;
  }

  if (options.outputCss) {
    for (const internal of imports.reverse()) {
      codeString = `@import "${internal}"; ${codeString}`;
    }
    //offload to bun
    return {
      contents: codeString,
      loader: "css",
    };
  }

  const needsResolving = returnedDependencies.length > 0; //codeString.includes("[BUN_RESOLVE]");
  const styleResolver = needsResolving
    ? `import bun_style_plugin_resolver from "bun-style-plugin-resolver";`
    : "";
  const cssThroughResolver = needsResolving
    ? `bun_style_plugin_resolver(\`${codeString}\`, resolverPlaceholders)`
    : `\`${codeString}\``;
  const nameMap = Object.fromEntries(
    Object.entries(exports || {}).map(([key, item]) => [key, item.name]),
  );

  const imported = imports
    .map((url, i) => {
      return `import { 
        css as _css${i}, 
        classes as _classes${i}, 
        injectedStyles as _injectedStyles${i},
      } from "${url}";`;
    })
    .join("\n");
  const exported = imports.map((_, i) => `_css${i}`).join(" + ");
  let importedClasses = imports.map((_, i) => `_classes${i}`).join(", ...");
  if (!importedClasses) importedClasses = "{}";
  let injectedStyleElements = imports
    .map((_, i) => `..._injectedStyles${i}`)
    .join(", ");
  if (injectedStyleElements) injectedStyleElements += ", ";

  let classExport = JSON.stringify(options.cssModules ? nameMap : {});
  if (importedClasses !== "{}" && options.forwardClassImports) {
    const restExport = classExport.substring(1, classExport.length - 1);
    classExport = `{...${importedClasses}${restExport ? `, ${restExport}` : ``}}`;
  }
  const utilsImport = `import { insertCssIntoDom, insertStyles, removeStyles } from "bun-style-plugin-importer";`;

  const resultingCss = `
const thisCss = ${cssThroughResolver};
const resultingCss = ${exported ? `${exported} + ` : ``}thisCss;
`;

  let thisInsertedElement = ``;
  let elementInserted = ``;
  let insertPreCheckString = ``;
  if (options.autoInject) {
    // do not inject resulting css if autoInject is true, but do inject the css from this file
    // this is because the resulting css may be a combination of multiple files, and we only want to inject the css from this file
    thisInsertedElement = `let thisInsertedElement = insertCssIntoDom(thisCss);`;
    injectedStyleElements += `thisInsertedElement`;
  } else {
    elementInserted = `let elementInserted = false;`;
    insertPreCheckString = `
  if(!elementInserted) {
    elementInserted = true;
    injectedStyles.push(insertCssIntoDom(resultingCss, selector));    
  }
    `;
  }
  const exportContent = `
export const css = resultingCss;
export const classes = ${classExport};
export const injectedStyles = [${injectedStyleElements}];
${elementInserted}
export function injectStyles(selector) {
${insertPreCheckString}
  insertStyles(injectedStyles, selector);
}
export function ejectStyles() {
  removeStyles(injectedStyles);
}
  `;
  const defaultExport = `export default {css, classes, injectedStyles, injectStyles, ejectStyles};`;

  let contents = `
${styleResolver}
${importedUrls}
${utilsImport}
${imported}
${resultingCss}
${thisInsertedElement}
${exportContent}
${defaultExport}
  `;
  return {
    contents,
    loader: "js",
  };
}
