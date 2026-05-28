import { BaseCatalogService } from "./BaseCatalogService"
import type {
  MacroregionCreateDTO,
  MacroregionResponseDTO,
  MacroregionUpdateDTO,
} from "./types/macroregion"

export const macroregionCatalogService = new BaseCatalogService<
  MacroregionResponseDTO,
  MacroregionCreateDTO,
  MacroregionUpdateDTO
>("/macroregiones")
