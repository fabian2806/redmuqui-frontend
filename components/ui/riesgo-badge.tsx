import { SEMAFORO, type NivelSemaforo } from "@/lib/reportes"
import { cn } from "@/lib/utils"

interface RiesgoBadgeProps {
  nivel: NivelSemaforo
  className?: string
}

/**
 * Badge del semáforo de portafolio (Sprint 4 ③): punto de color + etiqueta
 * (Crítico / En riesgo / Saludable). Comparte tokens con `SEMAFORO`.
 */
export function RiesgoBadge({ nivel, className }: RiesgoBadgeProps) {
  const meta = SEMAFORO[nivel]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        meta.bg,
        meta.text,
        meta.border,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  )
}
