import type { PaginationParams } from "./types"

/** Serializa `page` y `size` como query string (`?page=0&size=20`). */
export function toPageQueryString(params?: PaginationParams): string {
  if (!params) return ""

  const search = new URLSearchParams()
  if (params.page !== undefined) {
    search.set("page", String(params.page))
  }
  if (params.size !== undefined) {
    search.set("size", String(params.size))
  }

  const query = search.toString()
  return query ? `?${query}` : ""
}
