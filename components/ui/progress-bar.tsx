import { cn } from "@/lib/utils"

interface ProgressBarProps {
  value: number
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
  indicatorClassName?: string
}

export function ProgressBar({
  value,
  showLabel = true,
  size = "md",
  className,
  indicatorClassName,
}: ProgressBarProps) {
  const getColor = () => {
    if (value >= 75) return "bg-[#2E7D32]"
    if (value >= 50) return "bg-[#FFD600]"
    if (value >= 25) return "bg-[#F57C00]"
    return "bg-[#C8102E]"
  }

  const getHeight = () => {
    switch (size) {
      case "sm":
        return "h-1.5"
      case "lg":
        return "h-3"
      default:
        return "h-2"
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("flex-1 rounded-full bg-[#E0E0E0]", getHeight())}>
        <div
          className={cn(
            "rounded-full transition-all duration-300",
            getHeight(),
            indicatorClassName ?? getColor(),
          )}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-[#5C5C5C] min-w-[32px] text-right">
          {value}%
        </span>
      )}
    </div>
  )
}
