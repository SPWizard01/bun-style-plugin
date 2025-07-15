declare module "*.module.css" {
  export const classes: Record<string, string>;
  export const css: string;
}

declare module '*.css' {
  export const classes: Record<string, string>;
  export const css: string;
}
