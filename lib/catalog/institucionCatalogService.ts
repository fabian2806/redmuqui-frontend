import { BaseCatalogService } from "./BaseCatalogService"
import type {
  InstitucionCreateDTO,
  InstitucionResponseDTO,
  InstitucionUpdateDTO,
} from "./types/institucion"

export const institucionCatalogService = new BaseCatalogService<
  InstitucionResponseDTO,
  InstitucionCreateDTO,
  InstitucionUpdateDTO
>("/instituciones")
