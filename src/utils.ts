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
};
/**
 * Add a style tag to the document
 * @param code
 */
export function insertStyleElement(code: string, selector?: string) {
  const codeHash = simpleHash(code);
  const style = window.document.createElement("style");
  if (!codeHash) return style;
  if (importedStyleMap.has(codeHash)) {
    const existingStyle = importedStyleMap.get(codeHash);
    if (existingStyle) {
      return existingStyle;
    }
  }
  style.innerHTML = code;
  if (selector) {
    const result = window.document.querySelector(selector)
    style.setAttribute("data-bun-selector", selector);
    if (result) {
      result.appendChild(style);
    } else {
      window.document.head.appendChild(style);
    }
  } else {
    window.document.head.appendChild(style);
  }
  importedStyleMap.set(codeHash, style);
  return style;
}
