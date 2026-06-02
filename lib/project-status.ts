import type { EstadoProyecto } from "@/lib/types"

export const ESTADOS_PROYECTO: Array<{ value: EstadoProyecto; label: string }> = [
  { value: "ACTIVO", label: "Activo" },
  { value: "CERRADO", label: "Cerrado" },
  { value: "SUSPENDIDO", label: "Suspendido" },
]

export const ESTADO_PROYECTO_LABELS: Record<EstadoProyecto, string> = {
  ACTIVO: "Activo",
  CERRADO: "Cerrado",
  SUSPENDIDO: "Suspendido",
}

export function normalizarEstadoProyecto(value: string | null | undefined): EstadoProyecto {
  if (value === "CERRADO" || value === "Cerrado") return "CERRADO"
  if (value === "SUSPENDIDO" || value === "Suspendido") return "SUSPENDIDO"
  return "ACTIVO"
}
