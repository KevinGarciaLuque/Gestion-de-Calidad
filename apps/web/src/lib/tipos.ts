export interface Paginado<T> {
  datos: T[]
  total: number
  pagina: number
  porPagina: number
}

export type TipoAlcance = 'GLOBAL' | 'UNIDAD' | 'PROCESO'

export type TipoUnidad =
  | 'HOSPITAL'
  | 'DIRECCION'
  | 'SUBDIRECCION'
  | 'DEPARTAMENTO'
  | 'SERVICIO'
  | 'AREA'

export const ETIQUETA_TIPO_UNIDAD: Record<TipoUnidad, string> = {
  HOSPITAL: 'Hospital / sede',
  DIRECCION: 'Dirección',
  SUBDIRECCION: 'Subdirección',
  DEPARTAMENTO: 'Departamento',
  SERVICIO: 'Servicio',
  AREA: 'Área',
}
