const importedStyleMap: Map<string, HTMLStyleElement> = new Map();

function simpleHash(str: string) {
  if (!str) return "";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
  }
  // Convert to 32bit unsigned integer in base 36 and pad with "0" to ensure length is 7.
  return (hash >>> 0).toString(36);
}
/**
 * Add a style tag to the document
 * @param code
 */
export function insertCssIntoDom(code: string, selector?: string) {
  const codeHash = simpleHash(code);
  const style = window.document.createElement("style");
  if (!codeHash) return style;
  const existingStyle = importedStyleMap.get(codeHash);
  if (existingStyle) {
    insertStyles([existingStyle], selector);
    return existingStyle;
  }

  style.innerHTML = code;

  insertStyles([style], selector);
  importedStyleMap.set(codeHash, style);
  return style;
}

export function insertStyles(
  styles: readonly HTMLStyleElement[],
  selector?: string,
) {
  for (const style of styles) {
    if (!style || style.isConnected) continue;
    if (selector) {
      style.setAttribute("data-bun-selector", selector);
    }
    const target = selector ? window.document.querySelector(selector) : null;
    (target ?? window.document.head).appendChild(style);
  }
}

export function removeStyles(styles: readonly HTMLStyleElement[]) {
  for (const style of styles) {
    style.remove();
  }
}
