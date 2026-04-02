/**
 * Entry Router — selects lightweight customer bundle or full app bundle.
 *
 * Vite's HTML import-analysis plugin statically resolves ALL import() calls
 * inside <script type="module"> in index.html, even inside if/else branches.
 * Moving the conditional logic into a .ts file avoids this — Vite treats
 * dynamic import() in .ts files as proper code-split points.
 */

if ((window as any).__GRT_CUSTOMER_FAST) {
  import("./customer-entry");
} else {
  import("./main");
}
