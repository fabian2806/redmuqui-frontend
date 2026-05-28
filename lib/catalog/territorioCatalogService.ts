import { BaseCatalogService } from "./BaseCatalogService"
import type {
  TerritorioCreateDTO,
  TerritorioResponseDTO,
  TerritorioUpdateDTO,
} from "./types/territorio"

export const territorioCatalogService = new BaseCatalogService<
  TerritorioResponseDTO,
  TerritorioCreateDTO,
  TerritorioUpdateDTO
>("/territorios")
