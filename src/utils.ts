const importedCssHashes: string[] = [];

async function getCssHash(css: string) {
  if(!css) return "";
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
  if (!window?.document) {
    return;
  }
  const codeHash = await getCssHash(code);
  if(!codeHash || importedCssHashes.includes(codeHash)) return;
  importedCssHashes.push(codeHash);
  const style = window.document.createElement("style");
  style.innerHTML = code;
  if (selector) {
    const result = window.document.querySelector(selector)
    style.setAttribute("data-bun-selector", selector);
    if (result) {
      result.appendChild(style);
      return;
    }
  }
  window.document.head.appendChild(style);
}
