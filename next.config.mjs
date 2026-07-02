/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    // jspdf expone un build de Node (jspdf.node.min.js) que hace `require("fflate")`, y
    // fflate bajo la condición "node" resuelve a lib/node.cjs, que tiene un
    // `new Worker(..., { eval: true })` que el bundler no puede resolver ("Can't resolve
    // <dynamic>"). Durante el SSR de un Client Component, Turbopack elige esos builds de
    // Node. Forzamos los builds de navegador en TODOS los entornos: son puro browser (fflate
    // usa Web Workers vía Blob, no worker_threads) y el PDF solo se ejecuta client-side
    // (import dinámico en exportar.ts), así que el SSR nunca los evalúa, solo los resuelve.
    resolveAlias: {
      jspdf: "jspdf/dist/jspdf.es.min.js",
      fflate: "fflate/browser",
    },
  },
}

export default nextConfig
