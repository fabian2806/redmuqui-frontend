import { api } from "@/lib/api"
import type {
  Conteo,
  DocumentoReciente,
  Indicadores,
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
