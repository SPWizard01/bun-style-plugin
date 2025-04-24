const importedStyleMap: Map<string, HTMLStyleElement> = new Map();

async function getCssHash(css: string) {
  if (!css) return "";
  const encoded = new TextEncoder().encode(css);
  const hash = await window.crypto.subtle.digest("SHA-1", encoded);
  const hashArray = Array.from(new Uint8Array(hash));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Add a style tag to the document
 * @param code
 */
export async function insertStyleElement(code: string, selector?: string) {
  const codeHash = await getCssHash(code);
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
