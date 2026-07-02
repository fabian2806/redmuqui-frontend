import { pdf } from "@react-pdf/renderer"
import * as React from "react"
import { ReporteProyectoExportable } from "@/components/proyectos/reporte-proyecto-exportable"
import type { ActividadResponse, DocumentoResponse, FaseResponse, ProyectoResponse } from "@/lib/types"

interface HitoExportable {
  id: string | number
  nombre: string
  estado: string
  fecha: string | null
  nombreFase?: string | null
  porcentajeAvance?: number | null
}

interface MiembroEquipo {
  nombre: string
  rol: string
}

interface DescargarFichaProyectoPdfProps {
  proyecto: ProyectoResponse | null
  actividades: ActividadResponse[]
  hitos: HitoExportable[]
  fases: FaseResponse[]
  documentos: DocumentoResponse[]
  equipo: MiembroEquipo[]
  nombreArchivo: string
}

/** Genera la ficha técnica del proyecto como PDF y la descarga. */
export async function descargarFichaProyectoPdf({
  proyecto,
  actividades,
  hitos,
  fases,
  documentos,
  equipo,
  nombreArchivo,
}: DescargarFichaProyectoPdfProps): Promise<void> {
  if (!proyecto) return

  const blob = await pdf(
    <ReporteProyectoExportable
      proyecto={proyecto}
      actividades={actividades}
      hitos={hitos}
      fases={fases}
      documentos={documentos}
      equipo={equipo}
    />,
  ).toBlob()

  const url = URL.createObjectURL(blob)
  const enlace = document.createElement("a")
  enlace.href = url
  enlace.download = `${nombreArchivo}.pdf`
  enlace.click()
  URL.revokeObjectURL(url)
}
