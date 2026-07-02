import type { MonedaCreateDTO, MonedaResponseDTO, MonedaUpdateDTO } from "./types/moneda"
import { BaseCatalogService } from "./BaseCatalogService"

export const monedaService = new BaseCatalogService<
  MonedaResponseDTO,
  MonedaCreateDTO,
  MonedaUpdateDTO
>("/monedas")
