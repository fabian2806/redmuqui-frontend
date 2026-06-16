import { api } from "@/lib/api"
import type {
  ActividadReciente,
  CoberturaTerritorial,
  Conteo,
  ConteoPresupuesto,
  DocumentoReciente,
  Indicadores,
  MacroregionResumen,
  ProyectoAvance,
  ProyectoRiesgo,
} from "./types"

function queryAnio(anio?: number): string {
  return anio ? `?anio=${encodeURIComponent(anio)}` : ""
}

/**
 * Servicio del dashboard e indicadores (RF-069 a RF-074).
 * Consume los endpoints de agregación de `/api/v1/reportes` (permiso REPORTES_READ).
 */

/** RF-069 — GET `/reportes/indicadores`. KPIs globales de la red. */
export async function obtenerIndicadores(anio?: number): Promise<Indicadores> {
  return api.get<Indicadores>(`/reportes/indicadores${queryAnio(anio)}`)
}

/** RF-073 — GET `/reportes/proyectos-por-macroregion`. */
export async function obtenerProyectosPorMacroregion(anio?: number): Promise<Conteo[]> {
  return api.get<Conteo[]>(`/reportes/proyectos-por-macroregion${queryAnio(anio)}`)
}

export async function obtenerProyectosPorEstado(anio?: number): Promise<Conteo[]> {
  return api.get<Conteo[]>(`/reportes/proyectos-por-estado${queryAnio(anio)}`)
}

export async function obtenerProyectosPorEje(anio?: number): Promise<ConteoPresupuesto[]> {
  return api.get<ConteoPresupuesto[]>(`/reportes/proyectos-por-eje${queryAnio(anio)}`)
}

export async function obtenerAvanceProyectos(anio?: number): Promise<ProyectoAvance[]> {
  return api.get<ProyectoAvance[]>(`/reportes/avance-proyectos${queryAnio(anio)}`)
}

/** RF-074 — GET `/reportes/actividades-por-estado`. */
export async function obtenerActividadesPorEstado(anio?: number): Promise<Conteo[]> {
  return api.get<Conteo[]>(`/reportes/actividades-por-estado${queryAnio(anio)}`)
}

/** RF-071 — GET `/reportes/proyectos-en-riesgo`. */
export async function obtenerProyectosEnRiesgo(anio?: number): Promise<ProyectoRiesgo[]> {
  return api.get<ProyectoRiesgo[]>(`/reportes/proyectos-en-riesgo${queryAnio(anio)}`)
}

/** RF-072 — GET `/reportes/documentos-recientes`. */
export async function obtenerDocumentosRecientes(anio?: number): Promise<DocumentoReciente[]> {
  return api.get<DocumentoReciente[]>(`/reportes/documentos-recientes${queryAnio(anio)}`)
}

export async function obtenerDocumentosPorTipo(anio?: number): Promise<Conteo[]> {
  return api.get<Conteo[]>(`/reportes/documentos-por-tipo${queryAnio(anio)}`)
}

export async function obtenerDocumentosPorEstado(anio?: number): Promise<Conteo[]> {
  return api.get<Conteo[]>(`/reportes/documentos-por-estado${queryAnio(anio)}`)
}

export async function obtenerResumenMacroregiones(anio?: number): Promise<MacroregionResumen[]> {
  return api.get<MacroregionResumen[]>(`/reportes/resumen-macroregiones${queryAnio(anio)}`)
}

export async function obtenerActividadReciente(anio?: number): Promise<ActividadReciente[]> {
  return api.get<ActividadReciente[]>(`/reportes/actividad-reciente${queryAnio(anio)}`)
}

/** Sprint 4 ④ — GET `/reportes/cobertura-territorial`. Cobertura por territorio para el mapa. */
export async function obtenerCoberturaTerritorial(
  nivel: string = "DEPARTAMENTO",
): Promise<CoberturaTerritorial[]> {
  return api.get<CoberturaTerritorial[]>(
    `/reportes/cobertura-territorial?nivel=${encodeURIComponent(nivel)}`,
  )
}
