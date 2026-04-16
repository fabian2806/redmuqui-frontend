// Mock Data para Red Muqui Plataforma

export type Macroregion = "Norte" | "Centro" | "Sur"
export type EjeTematico = "Agua y Territorio" | "Derechos Humanos" | "Minería Artesanal (MAPE)" | "Vigilancia Ambiental" | "Incidencia Política" | "Fortalecimiento Organizacional"
export type EstadoProyecto = "Activo" | "En riesgo" | "Cerrado" | "Suspendido"
export type EstadoDocumento = "Borrador" | "En revisión" | "Publicado"
export type TipoDocumento = "Informe" | "Pronunciamiento" | "Investigación" | "Manual" | "Cartilla" | "Resumen técnico"
export type RolUsuario = "Administrador" | "Secretaría Ejecutiva" | "Equipo Técnico" | "Coordinación Macroregional" | "Institución Miembro" | "Solo lectura"

export interface Proyecto {
  id: string
  nombre: string
  codigo: string
  descripcion: string
  objetivo: string
  macroregion: Macroregion
  ejeTematico: EjeTematico
  territorios: string[]
  responsable: string
  equipo: string[]
  fechaInicio: string
  fechaFin: string
  avance: number
  estado: EstadoProyecto
  institucionesMiembro: string[]
  presupuesto?: number
  fuentesDonantes?: { nombre: string; contratoUrl: string }[]
}

export interface Actividad {
  id: string
  proyectoId: string
  nombre: string
  responsable: string
  fechaInicio: string
  fechaFin: string
  estado: "Completada" | "En progreso" | "Pendiente" | "Vencida"
  avance: number
  subactividades?: {
    id: string
    nombre: string
    responsable: string
    presupuesto?: number
    hombresInvolucrados?: number
    mujeresInvolucradas?: number
    archivosEvidencia?: { id: string; nombre: string; url: string }[]
    cofinanciadoPor?: { actividadId: string; monto: number }[]
  }[]
}

export interface Hito {
  id: string
  proyectoId: string
  nombre: string
  fecha: string
  estado: "Completado" | "Pendiente" | "Vencido"
}

export interface Documento {
  id: string
  titulo: string
  tipo: TipoDocumento
  descripcion: string
  proyectoId?: string
  proyectoNombre?: string
  territorio?: string
  ejeTematico: EjeTematico
  macroregion?: Macroregion
  responsableElaboracion: string
  validadoPor?: string
  fechaElaboracion: string
  fechaRevision?: string
  fechaPublicacion?: string
  version: string
  estado: EstadoDocumento
  archivos: { nombre: string; tamaño: string; fecha: string }[]
  institucionesMiembro?: string[]
}

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: RolUsuario
  macroregion?: Macroregion
  institucion?: string
  ultimoAcceso: string
  estado: "Activo" | "Inactivo" | "Pendiente"
  avatar?: string
}

export interface BitacoraEntry {
  id: string
  fecha: string
  usuario: string
  tipo: "proyecto" | "informe" | "actividad" | "incidencia" | "usuario"
  accion: string
  descripcion: string
  entidadId: string
  entidadNombre: string
}

// Instituciones miembro
export const institucionesMiembro = [
  "CooperAcción",
  "GRUFIDES",
  "CEPES",
  "Fedepaz",
  "Labor Pasco",
  "CEDHA",
  "Propuesta Ciudadana",
  "CBC",
  "APRODEH",
  "Natura - Instituto Ambientalista",
  "AMAS",
  "Proyecto Amigo"
]

// Proyectos mock
export const proyectos: Proyecto[] = [
  {
    id: "1",
    nombre: "Monitoreo Ambiental Comunitario - Conga",
    codigo: "PRY-2024-001",
    descripcion: "Proyecto de monitoreo participativo de calidad de agua en la zona de influencia del proyecto minero Conga, involucrando a comunidades campesinas de Cajamarca.",
    objetivo: "Fortalecer las capacidades de vigilancia ambiental comunitaria y documentar impactos en recursos hídricos.",
    macroregion: "Norte",
    ejeTematico: "Agua y Territorio",
    territorios: ["Cajamarca", "Celendín", "Hualgayoc"],
    responsable: "Carlos Quispe",
    equipo: ["María Torres", "Ana Huanca", "Pedro Mendoza"],
    fechaInicio: "2024-01-15",
    fechaFin: "2025-12-31",
    avance: 65,
    estado: "Activo",
    institucionesMiembro: ["GRUFIDES", "Fedepaz"],
    presupuesto: 85000
  },
  {
    id: "2",
    nombre: "Defensa Territorial - Río Blanco",
    codigo: "PRY-2024-002",
    descripcion: "Acompañamiento legal y técnico a comunidades de la sierra de Piura frente al proyecto minero Río Blanco, fortaleciendo la defensa del territorio y los páramos.",
    objetivo: "Proteger los ecosistemas de páramos y bosques de neblina de la sierra piurana.",
    macroregion: "Norte",
    ejeTematico: "Derechos Humanos",
    territorios: ["Piura", "Ayabaca", "Huancabamba"],
    responsable: "Luis Vargas",
    equipo: ["Carmen Sánchez", "Roberto Díaz"],
    fechaInicio: "2024-03-01",
    fechaFin: "2025-06-30",
    avance: 45,
    estado: "Activo",
    institucionesMiembro: ["Fedepaz", "APRODEH"],
    presupuesto: 62000,
    fuentesDonantes: [
      { nombre: "Unión Europea", contratoUrl: "#" },
      { nombre: "Oxfam", contratoUrl: "#" }
    ]
  },
  {
    id: "3",
    nombre: "Vigilancia Ambiental - Tía María",
    codigo: "PRY-2024-003",
    descripcion: "Seguimiento y documentación de los impactos potenciales del proyecto Tía María en el Valle de Tambo, Arequipa.",
    objetivo: "Documentar y visibilizar los riesgos ambientales y sociales del proyecto minero en el valle agrícola.",
    macroregion: "Sur",
    ejeTematico: "Vigilancia Ambiental",
    territorios: ["Arequipa", "Islay", "Valle de Tambo"],
    responsable: "Ana Huanca",
    equipo: ["José Mamani", "Rosa Quispe"],
    fechaInicio: "2024-02-01",
    fechaFin: "2025-03-15",
    avance: 78,
    estado: "En riesgo",
    institucionesMiembro: ["Labor Pasco", "CooperAcción"],
    presupuesto: 55000
  },
  {
    id: "4",
    nombre: "Incidencia Política - Las Bambas",
    codigo: "PRY-2024-004",
    descripcion: "Proyecto de incidencia ante autoridades nacionales e internacionales sobre la situación de comunidades afectadas por Las Bambas.",
    objetivo: "Lograr compromisos concretos del Estado y la empresa para atender demandas comunitarias.",
    macroregion: "Sur",
    ejeTematico: "Incidencia Política",
    territorios: ["Apurímac", "Cotabambas", "Grau"],
    responsable: "María Torres",
    equipo: ["Carlos Quispe", "Luis Vargas", "Ana Huanca"],
    fechaInicio: "2024-01-01",
    fechaFin: "2024-12-31",
    avance: 82,
    estado: "Activo",
    institucionesMiembro: ["CooperAcción", "APRODEH", "Fedepaz"],
    presupuesto: 95000
  },
  {
    id: "5",
    nombre: "Fortalecimiento MAPE - Junín",
    codigo: "PRY-2024-005",
    descripcion: "Programa de fortalecimiento de capacidades para mineros artesanales en la región Junín, promoviendo prácticas sostenibles.",
    objetivo: "Mejorar las prácticas ambientales y la formalización de la minería artesanal en Junín.",
    macroregion: "Centro",
    ejeTematico: "Minería Artesanal (MAPE)",
    territorios: ["Junín", "La Oroya", "Yauli"],
    responsable: "Pedro Mendoza",
    equipo: ["Carmen Sánchez"],
    fechaInicio: "2024-04-01",
    fechaFin: "2025-09-30",
    avance: 35,
    estado: "Activo",
    institucionesMiembro: ["Labor Pasco", "CEDHA"],
    presupuesto: 48000
  },
  {
    id: "6",
    nombre: "Relaves Tamboraque - San Mateo",
    codigo: "PRY-2024-006",
    descripcion: "Seguimiento al caso de relaves mineros en San Mateo de Huanchor, documentando afectaciones a la cuenca del Rímac.",
    objetivo: "Documentar los impactos de los relaves y promover la remediación ambiental.",
    macroregion: "Centro",
    ejeTematico: "Vigilancia Ambiental",
    territorios: ["Lima", "Huarochirí", "San Mateo"],
    responsable: "Roberto Díaz",
    equipo: ["María Torres", "José Mamani"],
    fechaInicio: "2024-05-01",
    fechaFin: "2025-04-30",
    avance: 52,
    estado: "Activo",
    institucionesMiembro: ["CooperAcción", "CEPES"],
    presupuesto: 42000
  },
  {
    id: "7",
    nombre: "Quellaveco - Monitoreo Participativo",
    codigo: "PRY-2024-007",
    descripcion: "Implementación de sistema de monitoreo ambiental participativo en la zona de influencia del proyecto Quellaveco.",
    objetivo: "Establecer un sistema de vigilancia ambiental comunitaria efectivo y sostenible.",
    macroregion: "Sur",
    ejeTematico: "Agua y Territorio",
    territorios: ["Moquegua", "Mariscal Nieto", "Torata"],
    responsable: "José Mamani",
    equipo: ["Rosa Quispe", "Ana Huanca"],
    fechaInicio: "2024-06-01",
    fechaFin: "2025-11-30",
    avance: 28,
    estado: "Activo",
    institucionesMiembro: ["Labor Pasco", "CBC"],
    presupuesto: 72000
  },
  {
    id: "8",
    nombre: "Antapaccay - Derechos Humanos",
    codigo: "PRY-2024-008",
    descripcion: "Documentación de casos de vulneración de derechos humanos en comunidades del entorno de Antapaccay, Espinar.",
    objetivo: "Sistematizar casos y generar incidencia para la protección de derechos de comunidades.",
    macroregion: "Sur",
    ejeTematico: "Derechos Humanos",
    territorios: ["Cusco", "Espinar", "Yauri"],
    responsable: "Carmen Sánchez",
    equipo: ["Carlos Quispe", "Luis Vargas"],
    fechaInicio: "2024-02-15",
    fechaFin: "2024-08-31",
    avance: 95,
    estado: "Cerrado",
    institucionesMiembro: ["APRODEH", "Fedepaz", "CBC"],
    presupuesto: 38000
  }
]

// Actividades mock
export const actividades: Actividad[] = [
  { id: "1", proyectoId: "1", nombre: "Capacitación en monitoreo de agua", responsable: "Ana Huanca", fechaInicio: "2024-02-01", fechaFin: "2024-03-15", estado: "Completada", avance: 100, subactividades: [
    { id: "sub1", nombre: "Taller introductorio Cajamarca", responsable: "Pedro Mendoza", presupuesto: 1500, hombresInvolucrados: 15, mujeresInvolucradas: 20, archivosEvidencia: [{ id: "f1", nombre: "lista_asistencia_caja.pdf", url: "#" }] },
    { id: "sub2", nombre: "Taller práctico Celendín", responsable: "Ana Huanca", presupuesto: 3500, cofinanciadoPor: [{ actividadId: "6", monto: 2500 }] }
  ] },
  { id: "2", proyectoId: "1", nombre: "Toma de muestras - primera fase", responsable: "Pedro Mendoza", fechaInicio: "2024-03-20", fechaFin: "2024-05-30", estado: "Completada", avance: 100 },
  { id: "3", proyectoId: "1", nombre: "Análisis de laboratorio", responsable: "Carlos Quispe", fechaInicio: "2024-06-01", fechaFin: "2024-07-31", estado: "Completada", avance: 100 },
  { id: "4", proyectoId: "1", nombre: "Elaboración de informe técnico", responsable: "María Torres", fechaInicio: "2024-08-01", fechaFin: "2024-09-30", estado: "En progreso", avance: 65, subactividades: [
    { id: "sub3", nombre: "Recolección de datos secundarios", responsable: "María Torres", hombresInvolucrados: 2, mujeresInvolucradas: 3 }
  ]},
  { id: "5", proyectoId: "1", nombre: "Socialización con comunidades", responsable: "Ana Huanca", fechaInicio: "2024-10-01", fechaFin: "2024-11-15", estado: "Pendiente", avance: 0 },
  { id: "6", proyectoId: "3", nombre: "Mapeo de actores", responsable: "José Mamani", fechaInicio: "2024-02-15", fechaFin: "2024-03-31", estado: "Completada", avance: 100 },
  { id: "7", proyectoId: "3", nombre: "Talleres informativos", responsable: "Rosa Quispe", fechaInicio: "2024-04-01", fechaFin: "2024-04-20", estado: "Vencida", avance: 80 },
  { id: "8", proyectoId: "4", nombre: "Reunión con congresistas", responsable: "María Torres", fechaInicio: "2024-05-01", fechaFin: "2024-05-15", estado: "Completada", avance: 100 },
]

// Hitos mock
export const hitos: Hito[] = [
  { id: "1", proyectoId: "1", nombre: "Inicio del proyecto", fecha: "2024-01-15", estado: "Completado" },
  { id: "2", proyectoId: "1", nombre: "Primera fase de monitoreo completada", fecha: "2024-05-30", estado: "Completado" },
  { id: "3", proyectoId: "1", nombre: "Informe técnico final", fecha: "2024-09-30", estado: "Pendiente" },
  { id: "4", proyectoId: "1", nombre: "Cierre y evaluación", fecha: "2025-12-31", estado: "Pendiente" },
]

// Documentos mock
export const documentos: Documento[] = [
  {
    id: "1",
    titulo: "Informe sobre agua, minería y crisis climática 2025",
    tipo: "Informe",
    descripcion: "Análisis de las intersecciones de los impactos de la crisis climática con los impactos de la actividad minera en zonas altoandinas del Perú.",
    proyectoId: "1",
    proyectoNombre: "Monitoreo Ambiental Comunitario - Conga",
    territorio: "Cajamarca",
    ejeTematico: "Agua y Territorio",
    macroregion: "Norte",
    responsableElaboracion: "María Torres",
    validadoPor: "Carlos Quispe",
    fechaElaboracion: "2025-01-15",
    fechaRevision: "2025-02-01",
    fechaPublicacion: "2025-02-15",
    version: "1.0",
    estado: "Publicado",
    archivos: [
      { nombre: "informe-agua-mineria-2025.pdf", tamaño: "4.2 MB", fecha: "2025-02-15" },
      { nombre: "anexos-tecnicos.pdf", tamaño: "2.1 MB", fecha: "2025-02-15" }
    ],
    institucionesMiembro: ["GRUFIDES", "CooperAcción"]
  },
  {
    id: "2",
    titulo: "Pronunciamiento sobre concesiones mineras en cabeceras de cuenca",
    tipo: "Pronunciamiento",
    descripcion: "Posicionamiento institucional de Red Muqui sobre el otorgamiento de concesiones mineras en zonas de cabeceras de cuenca.",
    ejeTematico: "Incidencia Política",
    macroregion: "Norte",
    responsableElaboracion: "Luis Vargas",
    validadoPor: "María Torres",
    fechaElaboracion: "2025-03-01",
    fechaPublicacion: "2025-03-10",
    version: "1.0",
    estado: "Publicado",
    archivos: [
      { nombre: "pronunciamiento-concesiones.pdf", tamaño: "1.2 MB", fecha: "2025-03-10" }
    ]
  },
  {
    id: "3",
    titulo: "Manual de monitoreo ambiental comunitario",
    tipo: "Manual",
    descripcion: "Guía práctica para la implementación de sistemas de monitoreo ambiental participativo en comunidades afectadas por minería.",
    proyectoId: "7",
    proyectoNombre: "Quellaveco - Monitoreo Participativo",
    territorio: "Moquegua",
    ejeTematico: "Vigilancia Ambiental",
    macroregion: "Sur",
    responsableElaboracion: "Ana Huanca",
    validadoPor: "José Mamani",
    fechaElaboracion: "2024-11-01",
    fechaRevision: "2024-12-15",
    version: "2.1",
    estado: "En revisión",
    archivos: [
      { nombre: "manual-monitoreo-v2.pdf", tamaño: "8.5 MB", fecha: "2024-12-15" }
    ],
    institucionesMiembro: ["Labor Pasco", "CBC"]
  },
  {
    id: "4",
    titulo: "Cartilla: Derechos de comunidades frente a la minería",
    tipo: "Cartilla",
    descripcion: "Material educativo sobre los derechos de las comunidades campesinas y nativas frente a proyectos extractivos.",
    ejeTematico: "Derechos Humanos",
    responsableElaboracion: "Carmen Sánchez",
    fechaElaboracion: "2024-09-15",
    version: "1.0",
    estado: "Publicado",
    archivos: [
      { nombre: "cartilla-derechos.pdf", tamaño: "3.8 MB", fecha: "2024-10-01" }
    ],
    institucionesMiembro: ["APRODEH", "Fedepaz"]
  },
  {
    id: "5",
    titulo: "Investigación: Impactos de Las Bambas en Cotabambas",
    tipo: "Investigación",
    descripcion: "Estudio integral sobre los impactos socioambientales del proyecto Las Bambas en las comunidades de la provincia de Cotabambas.",
    proyectoId: "4",
    proyectoNombre: "Incidencia Política - Las Bambas",
    territorio: "Apurímac",
    ejeTematico: "Incidencia Política",
    macroregion: "Sur",
    responsableElaboracion: "Roberto Díaz",
    validadoPor: "María Torres",
    fechaElaboracion: "2024-06-01",
    fechaRevision: "2024-08-15",
    fechaPublicacion: "2024-09-01",
    version: "1.0",
    estado: "Publicado",
    archivos: [
      { nombre: "investigacion-las-bambas.pdf", tamaño: "12.3 MB", fecha: "2024-09-01" },
      { nombre: "resumen-ejecutivo.pdf", tamaño: "1.5 MB", fecha: "2024-09-01" }
    ],
    institucionesMiembro: ["CooperAcción", "APRODEH"]
  },
  {
    id: "6",
    titulo: "Resumen técnico: Calidad de agua en cuencas del norte",
    tipo: "Resumen técnico",
    descripcion: "Síntesis de resultados del monitoreo de calidad de agua en las cuencas Perejil, Chuyugual y Caballo Moro.",
    proyectoId: "1",
    proyectoNombre: "Monitoreo Ambiental Comunitario - Conga",
    territorio: "La Libertad",
    ejeTematico: "Agua y Territorio",
    macroregion: "Norte",
    responsableElaboracion: "Pedro Mendoza",
    fechaElaboracion: "2025-01-20",
    version: "1.0",
    estado: "Borrador",
    archivos: [
      { nombre: "resumen-calidad-agua-borrador.pdf", tamaño: "2.8 MB", fecha: "2025-01-20" }
    ],
    institucionesMiembro: ["GRUFIDES"]
  },
  {
    id: "7",
    titulo: "Informe: Situación de defensores ambientales en Pasco",
    tipo: "Informe",
    descripcion: "Documentación de casos de defensores ambientales afectados por metales pesados en la región Pasco.",
    territorio: "Pasco",
    ejeTematico: "Derechos Humanos",
    macroregion: "Centro",
    responsableElaboracion: "Carmen Sánchez",
    validadoPor: "Luis Vargas",
    fechaElaboracion: "2024-10-01",
    fechaRevision: "2024-11-15",
    fechaPublicacion: "2024-12-01",
    version: "1.0",
    estado: "Publicado",
    archivos: [
      { nombre: "informe-defensores-pasco.pdf", tamaño: "5.6 MB", fecha: "2024-12-01" }
    ],
    institucionesMiembro: ["Labor Pasco", "CEDHA"]
  },
  {
    id: "8",
    titulo: "Posicionamiento MAPE 2025",
    tipo: "Pronunciamiento",
    descripcion: "Posicionamiento de Red Muqui sobre la pequeña minería y minería artesanal, proponiendo una hoja de ruta para la transición.",
    ejeTematico: "Minería Artesanal (MAPE)",
    responsableElaboracion: "María Torres",
    validadoPor: "Carlos Quispe",
    fechaElaboracion: "2025-02-01",
    fechaPublicacion: "2025-02-20",
    version: "1.0",
    estado: "Publicado",
    archivos: [
      { nombre: "posicionamiento-mape-2025.pdf", tamaño: "1.8 MB", fecha: "2025-02-20" }
    ]
  },
  {
    id: "9",
    titulo: "Guía de incidencia para comunidades",
    tipo: "Manual",
    descripcion: "Manual práctico de incidencia política para el acompañamiento a comunidades y poblaciones afectadas por la actividad minera.",
    ejeTematico: "Fortalecimiento Organizacional",
    responsableElaboracion: "Luis Vargas",
    fechaElaboracion: "2024-05-01",
    fechaPublicacion: "2024-06-15",
    version: "2.0",
    estado: "Publicado",
    archivos: [
      { nombre: "guia-incidencia.pdf", tamaño: "6.2 MB", fecha: "2024-06-15" }
    ],
    institucionesMiembro: ["Propuesta Ciudadana", "CooperAcción"]
  }
]

// Usuarios mock
export const usuarios: Usuario[] = [
  {
    id: "1",
    nombre: "María Torres",
    email: "maria.torres@muqui.org",
    rol: "Secretaría Ejecutiva",
    ultimoAcceso: "2025-04-06 09:30",
    estado: "Activo"
  },
  {
    id: "2",
    nombre: "Carlos Quispe",
    email: "carlos.quispe@muqui.org",
    rol: "Coordinación Macroregional",
    macroregion: "Norte",
    ultimoAcceso: "2025-04-05 14:22",
    estado: "Activo"
  },
  {
    id: "3",
    nombre: "Ana Huanca",
    email: "ana.huanca@muqui.org",
    rol: "Equipo Técnico",
    ultimoAcceso: "2025-04-06 08:45",
    estado: "Activo"
  },
  {
    id: "4",
    nombre: "Luis Vargas",
    email: "luis.vargas@cooperaccion.org.pe",
    rol: "Institución Miembro",
    institucion: "CooperAcción",
    ultimoAcceso: "2025-04-04 16:10",
    estado: "Activo"
  },
  {
    id: "5",
    nombre: "Pedro Mendoza",
    email: "pedro.mendoza@muqui.org",
    rol: "Equipo Técnico",
    ultimoAcceso: "2025-04-03 11:30",
    estado: "Activo"
  },
  {
    id: "6",
    nombre: "Carmen Sánchez",
    email: "carmen.sanchez@muqui.org",
    rol: "Coordinación Macroregional",
    macroregion: "Sur",
    ultimoAcceso: "2025-04-05 09:15",
    estado: "Activo"
  },
  {
    id: "7",
    nombre: "Roberto Díaz",
    email: "roberto.diaz@grufides.org",
    rol: "Institución Miembro",
    institucion: "GRUFIDES",
    ultimoAcceso: "2025-04-02 15:45",
    estado: "Activo"
  },
  {
    id: "8",
    nombre: "José Mamani",
    email: "jose.mamani@muqui.org",
    rol: "Coordinación Macroregional",
    macroregion: "Centro",
    ultimoAcceso: "2025-04-01 10:20",
    estado: "Activo"
  },
  {
    id: "9",
    nombre: "Rosa Quispe",
    email: "rosa.quispe@fedepaz.org",
    rol: "Institución Miembro",
    institucion: "Fedepaz",
    ultimoAcceso: "2025-03-28 14:00",
    estado: "Inactivo"
  },
  {
    id: "10",
    nombre: "Fernando Castillo",
    email: "fernando.castillo@aprodeh.org",
    rol: "Institución Miembro",
    institucion: "APRODEH",
    ultimoAcceso: "-",
    estado: "Pendiente"
  }
]

// Bitácora mock
export const bitacora: BitacoraEntry[] = [
  { id: "1", fecha: "2025-04-06 09:30", usuario: "María Torres", tipo: "proyecto", accion: "Actualización", descripcion: "Se actualizó el avance del proyecto al 65%", entidadId: "1", entidadNombre: "Monitoreo Ambiental Comunitario - Conga" },
  { id: "2", fecha: "2025-04-05 16:45", usuario: "Ana Huanca", tipo: "informe", accion: "Publicación", descripcion: "Se publicó el informe sobre agua y minería", entidadId: "1", entidadNombre: "Informe sobre agua, minería y crisis climática 2025" },
  { id: "3", fecha: "2025-04-05 14:20", usuario: "Carlos Quispe", tipo: "actividad", accion: "Completada", descripcion: "Se marcó como completada la actividad de análisis", entidadId: "3", entidadNombre: "Análisis de laboratorio" },
  { id: "4", fecha: "2025-04-04 11:00", usuario: "Luis Vargas", tipo: "proyecto", accion: "Nuevo comentario", descripcion: "Se agregó observación sobre el avance en comunidades", entidadId: "2", entidadNombre: "Defensa Territorial - Río Blanco" },
  { id: "5", fecha: "2025-04-03 15:30", usuario: "Pedro Mendoza", tipo: "informe", accion: "Nueva versión", descripcion: "Se subió la versión 2.1 del manual", entidadId: "3", entidadNombre: "Manual de monitoreo ambiental comunitario" },
  { id: "6", fecha: "2025-04-02 10:15", usuario: "Carmen Sánchez", tipo: "incidencia", accion: "Registro", descripcion: "Se reportó incidencia en zona de influencia", entidadId: "8", entidadNombre: "Antapaccay - Derechos Humanos" },
  { id: "7", fecha: "2025-04-01 09:00", usuario: "María Torres", tipo: "usuario", accion: "Invitación", descripcion: "Se invitó a nuevo usuario de APRODEH", entidadId: "10", entidadNombre: "Fernando Castillo" },
  { id: "8", fecha: "2025-03-31 14:45", usuario: "Roberto Díaz", tipo: "proyecto", accion: "Alerta", descripcion: "Se activó alerta por retraso en actividades", entidadId: "3", entidadNombre: "Vigilancia Ambiental - Tía María" },
]

// Helper functions
export const getProyectoById = (id: string) => proyectos.find(p => p.id === id)
export const getDocumentoById = (id: string) => documentos.find(d => d.id === id)
export const getUsuarioById = (id: string) => usuarios.find(u => u.id === id)
export const getActividadesByProyecto = (proyectoId: string) => actividades.filter(a => a.proyectoId === proyectoId)
export const getHitosByProyecto = (proyectoId: string) => hitos.filter(h => h.proyectoId === proyectoId)
export const getDocumentosByProyecto = (proyectoId: string) => documentos.filter(d => d.proyectoId === proyectoId)
export const getBitacoraByEntidad = (entidadId: string) => bitacora.filter(b => b.entidadId === entidadId)

// Stats helpers
export const getStats = () => {
  const proyectosActivos = proyectos.filter(p => p.estado === "Activo").length
  const actividadesVencidas = actividades.filter(a => a.estado === "Vencida").length
  const informesPendientes = documentos.filter(d => d.estado === "En revisión" || d.estado === "Borrador").length
  const productosPublicados = documentos.filter(d => d.estado === "Publicado").length
  
  return {
    proyectosActivos,
    actividadesVencidas,
    informesPendientes,
    productosPublicados
  }
}

export const getProyectosPorMacroregion = () => {
  return [
    { macroregion: "Norte", cantidad: proyectos.filter(p => p.macroregion === "Norte").length },
    { macroregion: "Centro", cantidad: proyectos.filter(p => p.macroregion === "Centro").length },
    { macroregion: "Sur", cantidad: proyectos.filter(p => p.macroregion === "Sur").length },
  ]
}

export const getActividadesPorEstado = () => {
  return [
    { estado: "En tiempo", cantidad: actividades.filter(a => a.estado === "En progreso" || a.estado === "Completada").length },
    { estado: "Pendientes", cantidad: actividades.filter(a => a.estado === "Pendiente").length },
    { estado: "Vencidas", cantidad: actividades.filter(a => a.estado === "Vencida").length },
  ]
}
