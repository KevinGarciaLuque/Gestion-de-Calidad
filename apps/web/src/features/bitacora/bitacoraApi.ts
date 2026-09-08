import { api } from '@/lib/api'
import type { Paginado } from '@/lib/tipos'

export interface EventoBitacora {
  id: string
  fecha: string
  actorId: string | null
  actorEmail: string | null
  accion: string
  entidad: string | null
  entidadId: string | null
  valorAnterior: unknown
  valorNuevo: unknown
  ip: string | null
  userAgent: string | null
}

export interface ListarBitacoraParams {
  actorId?: string
  entidad?: string
  accion?: string
  desde?: string
  hasta?: string
  pagina?: number
  porPagina?: number
}

export const bitacoraApi = {
  async listar(params: ListarBitacoraParams): Promise<Paginado<EventoBitacora>> {
    const { data } = await api.get<Paginado<EventoBitacora>>('/bitacora', { params })
    return data
  },
}
