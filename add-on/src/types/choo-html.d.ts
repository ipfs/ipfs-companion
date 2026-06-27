// choo/html (nanohtml) ships namespace-only types, so `html`...`` reads as
// "not callable" (TS2349) and editors lose IntelliSense across the view files.
// Declare it as the tagged-template function it actually is at runtime.
declare module 'choo/html/index.js' {
  const html: (strings: TemplateStringsArray, ...values: unknown[]) => HTMLElement
  export default html
}
