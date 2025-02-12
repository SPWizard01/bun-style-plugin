import type { BunPlugin } from "bun";
import { compileCSS } from "./compile-css";
import type { Options as EmbeddedOptions } from "sass-embedded"
import type { Options as RegularOptions } from "sass"
/**
 * No options for now
 */
export type StyleLoaderOptions = {
  /**
   * List of target browsers to support
   * @example ["chrome 80", "ie 11"]
   */
  targets?: string[];
  minify?: boolean;
  /**
   * Process url() imports in css files. Anything that starts with data: or http inside url() will be ignored
   */
  processUrlImports?: boolean;
  precompile?(source: string, path: string): string;
  cssModules?: boolean;
  forwardClassImports?: boolean;
  autoInject?: boolean;
  /**
   * Use embedded sass compiler or default sass compiler
   * Default: true
   */
  useSassEmbedded?: boolean;
  sassCompilerOptions?: RegularOptions<"async"> & EmbeddedOptions<"async">;
};

const defaultOptions: StyleLoaderOptions = {
  targets: [],
  minify: true,
  processUrlImports: true,
  useSassEmbedded: true
};


export function styleLoader(options: StyleLoaderOptions = {}): BunPlugin {
  const opts = { ...defaultOptions, ...options };
  let registryContents = ``;
  let resolverContents = ``;
  let importerContents = ``;
  return {
    name: "bun-style-plugin",
    async setup(build) {
      const [sass, fs, os, embedded] = await Promise.all([
        import("sass"),
        import("fs"),
        import("os"),
        import("sass-embedded")
      ]);
      const platform = os.platform();
      const compiler = opts.useSassEmbedded ? embedded : sass;

      function getFilePath(path: string) {
        const toRead = import.meta.resolve(path);
        const formatted = toRead.replace(platform === "win32" ? "file:///" : "file://", "");
        return formatted;
      }

      build.onResolve({ filter: /bun-style-plugin-importer/ }, (args) => {
        return {
          path: "bun-style-plugin-importer",
          namespace: "bun-style-plugin-importer",
        };
      });

      build.onResolve({ filter: /bun-style-plugin-registry/ }, (args) => {
        return {
          path: "bun-style-plugin-registry",
          namespace: "bun-style-plugin-registry",
        };
      });

      build.onResolve({ filter: /bun-style-plugin-resolver/ }, (args) => {
        return {
          path: "bun-style-plugin-resolver",
          namespace: "bun-style-plugin-resolver",
        };
      });

      build.onLoad({ filter: /./, namespace: "bun-style-plugin-registry" }, async (args) => {
        if (!registryContents) {
          const formatted = getFilePath("./importRegistry.js");
          registryContents = await fs.promises.readFile(formatted, "utf8");;
        }
        return {
          contents: registryContents,
          loader: "js",
        }
      });

      build.onLoad({ filter: /./, namespace: "bun-style-plugin-resolver" }, async (args) => {
        if (!resolverContents) {
          const formatted = getFilePath("./styleAssetResolver.js");
          resolverContents = await fs.promises.readFile(formatted, "utf8");;
        }

        return {
          contents: resolverContents,
          loader: "js",
        }
      });

      build.onLoad({ filter: /./, namespace: "bun-style-plugin-importer" }, async (args) => {
        if (!importerContents) {
          const formatted = getFilePath("./utils.js");
          importerContents = await fs.promises.readFile(formatted, "utf8");;
        }

        return {
          contents: importerContents,
          loader: "js",
        }
      });

      build.onLoad({ filter: /\.s?css$/ }, async (args) => {
        const importName = args.path.toLowerCase();
        const isSass = importName.endsWith(".scss");
        const isCssModule = importName.endsWith(".module.css");
        const isSassModule = importName.endsWith(".module.scss");
        const isModule = isCssModule || isSassModule;
        let cssContents = "";
        if (isSass) {
          const result = await compiler.compileAsync(args.path, { ...opts.sassCompilerOptions });
          cssContents = result.css;
        } else {
          cssContents = fs.readFileSync(args.path, "utf8");
        }

        const precompiled = opts.precompile?.(cssContents, args.path) ?? cssContents;
        const result = await compileCSS(precompiled, args.path, {
          cssModules: isModule && opts.cssModules,
          targets: opts.targets,
          minify: opts.minify,
          processUrlImports: opts.processUrlImports,
          forwardClassImports: opts.forwardClassImports,
          autoInject: opts.autoInject,
        });
        return result;
      });

      // build.onLoad({ filter: /\.scss$/ }, async (args) => {
      //   const result = await compiler.compileAsync(args.path, { ...opts.sassCompilerOptions });
      //   const isCssModule = args.path.endsWith(".module.scss");
      //   const precompiled = opts.precompile?.(result.css, args.path) ?? result.css;
      //   return compileCSS(precompiled, args.path, {
      //     targets: opts.targets,
      //     minify: opts.minify,
      //     cssModules: isCssModule && opts.cssModules,
      //     processUrlImports: opts.processUrlImports,
      //   });
      // });
    },
  };
}

