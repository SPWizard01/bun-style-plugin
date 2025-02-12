declare module "*.module.scss" {
  export const classes: Record<string, string>;
  export const css: string;
}

declare module '*.scss' {
  export const classes: Record<string, string>;
  export const css: string;
}


declare module "*.svg" {
  const content: string;
  export default content;
}