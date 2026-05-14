import type { Permiso } from "./types"

export function formatPermiso(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function getPermisoTexto(permiso: Permiso) {
  const textos: Record<string, { label: string; description: string }> = {
    USUARIOS_READ: {
      label: "Ver usuarios",
      description: "Puede consultar usuarios, roles y datos de acceso registrados.",
    },
    USUARIOS_CREATE: {
      label: "Crear usuarios",
      description: "Puede registrar nuevos usuarios en la plataforma.",
    },
    USUARIOS_UPDATE: {
      label: "Editar usuarios",
      description: "Puede actualizar información personal, rol e institución de usuarios.",
    },
    USUARIOS_DEACTIVATE: {
      label: "Activar o desactivar usuarios",
      description: "Puede cambiar el estado de acceso de usuarios del sistema.",
    },
    CATALOGOS_READ: {
      label: "Ver catálogos",
      description: "Puede consultar macroregiones, instituciones, territorios y ejes temáticos.",
    },
    CATALOGOS_MANAGE: {
      label: "Administrar catálogos",
      description: "Puede crear, editar y mantener los catálogos base del sistema.",
    },
    PROYECTOS_READ: {
      label: "Ver proyectos",
      description: "Puede consultar proyectos, avances, responsables y territorios asociados.",
    },
    PROYECTOS_CREATE: {
      label: "Crear proyectos",
      description: "Puede registrar nuevos proyectos institucionales.",
    },
    PROYECTOS_UPDATE: {
      label: "Editar proyectos",
      description: "Puede modificar datos, equipo, avance y configuración de proyectos.",
    },
    DOCUMENTOS_READ: {
      label: "Ver documentos",
      description: "Puede consultar documentos, informes y productos asociados.",
    },
    DOCUMENTOS_CREATE: {
      label: "Crear documentos",
      description: "Puede cargar nuevos informes, productos o archivos de soporte.",
    },
    DOCUMENTOS_UPDATE: {
      label: "Editar documentos",
      description: "Puede actualizar información y archivos de documentos existentes.",
    },
    DOCUMENTOS_VALIDATE: {
      label: "Validar documentos",
      description: "Puede revisar, aprobar u observar informes y productos oficiales.",
    },
    BITACORA_READ: {
      label: "Ver bitácora",
      description: "Puede revisar el historial de cambios y actividad registrada.",
    },
    REPORTES_READ: {
      label: "Ver reportes",
      description: "Puede consultar indicadores, resúmenes y reportes del sistema.",
    },
    REPORTES_EXPORT: {
      label: "Exportar reportes",
      description: "Puede descargar reportes y datos para análisis externo.",
    },
  }

  return textos[permiso.nombre] ?? {
    label: formatPermiso(permiso.nombre),
    description: permiso.tipo ? `Permiso de tipo ${formatPermiso(permiso.tipo).toLowerCase()} asignado a este rol.` : "Permiso asignado a este rol.",
  }
}
