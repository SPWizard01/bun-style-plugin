/**
 * Handled by bun plugin, it is an arbitrary import for a method inside importRegistry.js
 */
declare module "bun-style-plugin-registry" {
    function getImportFromStyleRegistry(relativePath: string): string;
    export { getImportFromStyleRegistry };
}