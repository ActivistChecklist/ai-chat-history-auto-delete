/**
 * Inserts the top-bar wrapper as the first child of #main-content using
 * insertBefore only — never removeChild() on Claude’s existing nodes (avoids
 * React reconciliation errors on SPA navigation).
 *
 * @param {HTMLElement} mainContent
 * @param {HTMLElement} wrapEl
 */
export function insertBarAsFirstChildOfMainContent(mainContent, wrapEl) {
  if (!mainContent || !wrapEl) return;
  mainContent.insertBefore(wrapEl, mainContent.firstElementChild);
}
