import type { BunPlugin } from "bun";
import compileCSS from "./compile-css";

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
  /**
   * Use embedded sass compiler or default sass compiler
   * Default: true
   */
  useSassEmbedded?: boolean;
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

  return {
    name: "bun-scss-loader",
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

      build.onResolve({ filter: /bun-style-plugin-registry/ }, (args) => {
        return {
          path: "bun-style-plugin-registry",
          namespace: "bun-style-plugin-registry",
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

      build.onResolve({ filter: /bun-style-plugin-resolver/ }, (args) => {
        return {
          path: "bun-style-plugin-resolver",
          namespace: "bun-style-plugin-resolver",
        };
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
      build.onLoad({ filter: /\.css$/ }, (args) => {
        const contents = fs.readFileSync(args.path, "utf8");
        const isCssModule = args.path.endsWith(".module.css");
        const precompiled = opts.precompile?.(contents, args.path) ?? contents;
        return compileCSS(precompiled, args.path, {
          cssModules: isCssModule,
          targets: opts.targets,
          minify: opts.minify,
          processUrlImports: opts.processUrlImports,
        });
      });

      build.onLoad({ filter: /\.scss$/ }, async (args) => {
        //const result = sass.compile(args.path);
        const result = await compiler.compileAsync(args.path);
        const isCssModule = args.path.endsWith(".module.scss");
        const precompiled = opts.precompile?.(result.css, args.path) ?? result.css;
        return compileCSS(precompiled, args.path, {
          targets: opts.targets,
          minify: opts.minify,
          cssModules: isCssModule,
          processUrlImports: opts.processUrlImports,
        });
      });
    },
  };
}

