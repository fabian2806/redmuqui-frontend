import { BaseCatalogService } from "./BaseCatalogService"
import type {
  EjeTematicoCreateDTO,
  EjeTematicoResponseDTO,
  EjeTematicoUpdateDTO,
} from "./types/eje-tematico"

export const ejeTematicoCatalogService = new BaseCatalogService<
  EjeTematicoResponseDTO,
  EjeTematicoCreateDTO,
  EjeTematicoUpdateDTO
>("/ejes-tematicos")
