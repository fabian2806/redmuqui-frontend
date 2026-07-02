"use client"

import type { ResumenIa } from "@/lib/ia"
import { ResumenGraficos } from "./resumen-graficos"

/**
 * Maqueta dedicada del reporte para exportar a PDF (Sprint 4 ⑤).
 *
 * Se renderiza oculta (fuera de pantalla) y `html-to-image` la captura. Usa
 * estilos en línea con colores hex — no depende del tema ni de clases de Tailwind
 * que compilan a `oklch`, para que el snapshot salga fiel y predecible.
 */
export function ReporteExportable({ resumen }: { resumen: ResumenIa }) {
  return (
    <div
      style={{
        width: 760,
        background: "#ffffff",
        padding: 28,
        color: "#1A1A1A",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      {/* Membrete */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "2px solid #FFD600",
          paddingBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "#FFD600",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 14,
              color: "#1A1A1A",
            }}
          >
            RM
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: 0.5 }}>RED MUQUI</div>
            <div style={{ fontSize: 11, color: "#5C5C5C" }}>Reporte Ejecutivo de Proyecto</div>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11, color: "#5C5C5C" }}>
          <div>{formatFecha(resumen.generadoEn)}</div>
          <div>{resumen.generadoPorIa ? `Generado con IA · ${resumen.modelo}` : "Resumen automático"}</div>
        </div>
      </div>

      {/* Título del proyecto */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.25 }}>{resumen.nombreProyecto}</div>
        <div style={{ fontSize: 12, color: "#5C5C5C", marginTop: 2 }}>Código {resumen.codigoInterno}</div>
      </div>

      {/* Gráficos */}
      {resumen.metricas && (
        <div style={{ marginTop: 16 }}>
          <ResumenGraficos metricas={resumen.metricas} />
        </div>
      )}

      {/* Narrativa (secciones + recomendaciones) */}
      <div
        style={{
          marginTop: 16,
          whiteSpace: "pre-line",
          fontSize: 12.5,
          lineHeight: 1.55,
          color: "#1A1A1A",
        }}
      >
        {resumen.resumen}
      </div>

      {/* Pie */}
      <div
        style={{
          marginTop: 20,
          borderTop: "1px solid #ECECEC",
          paddingTop: 8,
          fontSize: 10,
          color: "#9CA3AF",
        }}
      >
        Generado a partir de datos reales del sistema. Red Muqui · Documento interno.
      </div>
    </div>
  )
}

function formatFecha(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })
}
