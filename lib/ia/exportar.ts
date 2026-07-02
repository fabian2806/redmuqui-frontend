import { toPng } from "html-to-image"
import { jsPDF } from "jspdf"
import type { ResumenIa } from "./types"

/**
 * Exportación del reporte ejecutivo (Sprint 4 ⑤).
 * - PDF: captura un nodo dedicado (membrete + gráficos + texto) y lo pagina en A4.
 * - Markdown / CSV: cero dependencias (Blob), reutilizando el patrón de reportes.
 * Solo se usa desde componentes cliente (usa `document`, `Blob`, `Image`).
 */

function nombreBase(r: ResumenIa): string {
  return `reporte-${r.codigoInterno || r.idProyecto}`
}

function descargarBlob(contenido: string, nombreArchivo: string, mime: string): void {
  const blob = new Blob([contenido], { type: mime })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement("a")
  enlace.href = url
  enlace.download = nombreArchivo
  enlace.click()
  URL.revokeObjectURL(url)
}

function moneda(v: number | null): string {
  if (v == null) return "no definido"
  return "S/ " + v.toLocaleString("es-PE", { maximumFractionDigits: 0 })
}

function fecha(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })
}

/** Captura el nodo del reporte como imagen y la vuelca en un PDF A4 (multipágina si hace falta). */
export async function descargarReportePdf(nodo: HTMLElement, r: ResumenIa): Promise<void> {
  const dataUrl = await toPng(nodo, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true })

  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error("No se pudo cargar la imagen del reporte"))
    img.src = dataUrl
  })

  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const marginX = 24
  const imgW = pageW - marginX * 2
  const imgH = (img.height / img.width) * imgW

  // Paginación vertical: se coloca la misma imagen desplazada hacia arriba en cada página.
  let heightLeft = imgH
  let position = 0
  pdf.addImage(dataUrl, "PNG", marginX, position, imgW, imgH)
  heightLeft -= pageH
  while (heightLeft > 0) {
    position = heightLeft - imgH
    pdf.addPage()
    pdf.addImage(dataUrl, "PNG", marginX, position, imgW, imgH)
    heightLeft -= pageH
  }

  pdf.save(`${nombreBase(r)}.pdf`)
}

/** Descarga el reporte como Markdown: encabezado + narrativa + tabla de indicadores. */
export function descargarMarkdown(r: ResumenIa): void {
  const lineas: string[] = [
    `# Reporte Ejecutivo — ${r.nombreProyecto}`,
    "",
    `**Código:** ${r.codigoInterno}  `,
    `**Generado:** ${fecha(r.generadoEn)} · ${r.generadoPorIa ? `IA (${r.modelo})` : "resumen automático"}`,
    "",
    r.resumen,
    "",
  ]

  const m = r.metricas
  if (m) {
    const totalBenef = m.beneficiariosHombres + m.beneficiariosMujeres
    lineas.push(
      "## Indicadores",
      "",
      "| Indicador | Valor |",
      "|---|---|",
      `| Avance físico | ${Math.round(m.avance)}% |`,
      `| Presupuesto ejecutado | ${moneda(m.presupuestoEjecutado)} de ${moneda(m.presupuestoTotal)} |`,
      `| Beneficiarios | ${totalBenef} (${m.beneficiariosHombres} H / ${m.beneficiariosMujeres} M) |`,
      `| Actividades | ${m.actividadesFinalizadas}/${m.actividadesTotal} finalizadas · ${m.actividadesVencidas} vencidas |`,
      `| Hitos | ${m.hitosFinalizados}/${m.hitosTotal} · ${m.hitosVencidos} vencidos |`,
      `| Estado | ${m.enRiesgo ? "En riesgo" : "Sin alertas"} |`,
      "",
    )
  }

  descargarBlob(lineas.join("\n"), `${nombreBase(r)}.md`, "text/markdown;charset=utf-8")
}

/** Descarga los indicadores del reporte como CSV (BOM para Excel en español). */
export function descargarCsv(r: ResumenIa): void {
  const esc = (v: string | number | null): string =>
    `"${String(v ?? "").replaceAll('"', '""')}"`
  const fila = (k: string, v: string | number | null) => `${esc(k)},${esc(v)}`

  const filas: string[] = [
    fila("Reporte", `Reporte Ejecutivo — ${r.nombreProyecto}`),
    fila("Código interno", r.codigoInterno),
    fila("Generado", `${fecha(r.generadoEn)} (${r.generadoPorIa ? r.modelo : "automático"})`),
    "",
    fila("Indicador", "Valor"),
  ]

  const m = r.metricas
  if (m) {
    filas.push(
      fila("Avance físico (%)", Math.round(m.avance)),
      fila("Presupuesto total", m.presupuestoTotal),
      fila("Presupuesto ejecutado", m.presupuestoEjecutado),
      fila("Beneficiarios hombres", m.beneficiariosHombres),
      fila("Beneficiarios mujeres", m.beneficiariosMujeres),
      fila("Actividades finalizadas", m.actividadesFinalizadas),
      fila("Actividades en curso", m.actividadesEnCurso),
      fila("Actividades pendientes", m.actividadesPendientes),
      fila("Actividades vencidas", m.actividadesVencidas),
      fila("Actividades total", m.actividadesTotal),
      fila("Hitos finalizados", m.hitosFinalizados),
      fila("Hitos vencidos", m.hitosVencidos),
      fila("Hitos total", m.hitosTotal),
      fila("En riesgo", m.enRiesgo ? "Sí" : "No"),
    )
  }

  descargarBlob(`﻿${filas.join("\r\n")}`, `${nombreBase(r)}.csv`, "text/csv;charset=utf-8")
}
