import type {
  TipoDocumentoCreateDTO,
  TipoDocumentoResponseDTO,
  TipoDocumentoUpdateDTO,
} from "./types/tipo-documento"
import { BaseCatalogService } from "./BaseCatalogService"

export const tipoDocumentoService = new BaseCatalogService<
  TipoDocumentoResponseDTO,
  TipoDocumentoCreateDTO,
  TipoDocumentoUpdateDTO
>("/tipos-documento")
