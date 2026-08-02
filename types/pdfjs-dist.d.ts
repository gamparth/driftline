// pdfjs-dist only ships types for its package root, not for the build subpaths
// we import directly (modern build in the browser, legacy build under Node).
declare module "pdfjs-dist/build/pdf.mjs" {
  export * from "pdfjs-dist";
}

declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  export * from "pdfjs-dist";
}
