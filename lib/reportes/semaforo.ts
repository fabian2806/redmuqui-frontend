// =====================================================================
// Semáforo de Portafolio (Sprint 4 ③, RF-071).
// Clasifica la severidad de los proyectos que el backend ya marcó
// "en riesgo" en `/reportes/proyectos-en-riesgo`. La regla base vive en
// ReporteService (Java); aquí solo derivamos el color a partir de los
// campos del DTO, sin endpoint nuevo.
// =====================================================================

import type { ProyectoRiesgo } from "./types"

/** Niveles del semáforo. `saludable` no llega del endpoint (es el resto de activos). */
export type NivelSemaforo = "critico" | "atencion" | "saludable"

/** Nivel de severidad para un proyecto que el backend ya clasificó en riesgo. */
export type NivelRiesgo = "critico" | "atencion"

/**
 * Clasifica un proyecto en riesgo en su nivel de severidad.
 *
 * Regla de riesgo del backend (ReporteService):
 *   en-riesgo = hitosVencidos > 0  OR  (diasRestantes <= 30 AND avance < 70)
 *
 * Dentro de ese conjunto distinguimos:
 *   - critico  → hay hitos vencidos, o el plazo ya venció (diasRestantes < 0)
 *   - atencion → plazo próximo con avance bajo, sin hitos vencidos ni plazo vencido
 */
export function clasificarRiesgo(p: ProyectoRiesgo): NivelRiesgo {
  const plazoVencido = p.diasRestantes !== null && p.diasRestantes < 0
  if (p.hitosVencidos > 0 || plazoVencido) return "critico"
  return "atencion"
}

interface NivelSemaforoMeta {
  /** Etiqueta corta para el badge. */
  label: string
  /** Criterio, para la tarjeta resumen. */
  descripcion: string
  // Tokens Tailwind reutilizando la paleta del proyecto (rojo / ámbar / verde).
  text: string
  bg: string
  border: string
  /** Acento de borde izquierdo para las tarjetas resumen. */
  borderL: string
  dot: string
}

export const SEMAFORO: Record<NivelSemaforo, NivelSemaforoMeta> = {
  critico: {
    label: "Crítico",
    descripcion: "Hitos vencidos o plazo superado",
    text: "text-[#C8102E]",
    bg: "bg-[#C8102E]/10",
    border: "border-[#C8102E]/20",
    borderL: "border-l-[#C8102E]",
    dot: "bg-[#C8102E]",
  },
  atencion: {
    label: "En riesgo",
    descripcion: "Plazo próximo (≤30 días) y avance bajo (<70%)",
    text: "text-[#F57C00]",
    bg: "bg-[#F57C00]/10",
    border: "border-[#F57C00]/20",
    borderL: "border-l-[#F57C00]",
    dot: "bg-[#F57C00]",
  },
  saludable: {
    label: "Saludable",
    descripcion: "Sin alertas de plazo ni hitos vencidos",
    text: "text-[#2E7D32]",
    bg: "bg-[#2E7D32]/10",
    border: "border-[#2E7D32]/20",
    borderL: "border-l-[#2E7D32]",
    dot: "bg-[#2E7D32]",
  },
}
