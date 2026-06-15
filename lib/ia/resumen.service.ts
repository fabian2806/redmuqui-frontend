import { api } from "@/lib/api"
import type { ResumenIa } from "./types"

/**
 * Servicio del Resumen Ejecutivo con IA (Sprint 4 ⑤).
 * Consume el endpoint del backend (permiso PROYECTOS_READ o REPORTES_READ).
 * La integración con el proveedor (Gemini) y su API key viven SOLO en el backend.
 */

/** POST `/proyectos/{id}/resumen-ia`. Genera un resumen ejecutivo del proyecto a partir de datos reales. */
export async function generarResumenProyecto(
  idProyecto: string | number,
): Promise<ResumenIa> {
  return api.post<ResumenIa>(`/proyectos/${idProyecto}/resumen-ia`)
}
