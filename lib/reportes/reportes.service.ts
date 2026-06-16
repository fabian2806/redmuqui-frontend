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

/**
 * Servicio del dashboard e indicadores (RF-069 a RF-074).
 * Consume los endpoints de agregación de `/api/v1/reportes` (permiso REPORTES_READ).
 */

/** RF-069 — GET `/reportes/indicadores`. KPIs globales de la red. */
export async function obtenerIndicadores(): Promise<Indicadores> {
  return api.get<Indicadores>("/reportes/indicadores")
}

/** RF-073 — GET `/reportes/proyectos-por-macroregion`. */
export async function obtenerProyectosPorMacroregion(): Promise<Conteo[]> {
  return api.get<Conteo[]>("/reportes/proyectos-por-macroregion")
}

export async function obtenerProyectosPorEstado(): Promise<Conteo[]> {
  return api.get<Conteo[]>("/reportes/proyectos-por-estado")
}

export async function obtenerProyectosPorEje(): Promise<ConteoPresupuesto[]> {
  return api.get<ConteoPresupuesto[]>("/reportes/proyectos-por-eje")
}

export async function obtenerAvanceProyectos(): Promise<ProyectoAvance[]> {
  return api.get<ProyectoAvance[]>("/reportes/avance-proyectos")
}

/** RF-074 — GET `/reportes/actividades-por-estado`. */
export async function obtenerActividadesPorEstado(): Promise<Conteo[]> {
  return api.get<Conteo[]>("/reportes/actividades-por-estado")
}

/** RF-071 — GET `/reportes/proyectos-en-riesgo`. */
export async function obtenerProyectosEnRiesgo(): Promise<ProyectoRiesgo[]> {
  return api.get<ProyectoRiesgo[]>("/reportes/proyectos-en-riesgo")
}

/** RF-072 — GET `/reportes/documentos-recientes`. */
export async function obtenerDocumentosRecientes(): Promise<DocumentoReciente[]> {
  return api.get<DocumentoReciente[]>("/reportes/documentos-recientes")
}

export async function obtenerDocumentosPorTipo(): Promise<Conteo[]> {
  return api.get<Conteo[]>("/reportes/documentos-por-tipo")
}

export async function obtenerDocumentosPorEstado(): Promise<Conteo[]> {
  return api.get<Conteo[]>("/reportes/documentos-por-estado")
}

export async function obtenerResumenMacroregiones(): Promise<MacroregionResumen[]> {
  return api.get<MacroregionResumen[]>("/reportes/resumen-macroregiones")
}

export async function obtenerActividadReciente(): Promise<ActividadReciente[]> {
  return api.get<ActividadReciente[]>("/reportes/actividad-reciente")
}

/** Sprint 4 ④ — GET `/reportes/cobertura-territorial`. Cobertura por territorio para el mapa. */
export async function obtenerCoberturaTerritorial(
  nivel: string = "DEPARTAMENTO",
): Promise<CoberturaTerritorial[]> {
  return api.get<CoberturaTerritorial[]>(
    `/reportes/cobertura-territorial?nivel=${encodeURIComponent(nivel)}`,
  )
}
