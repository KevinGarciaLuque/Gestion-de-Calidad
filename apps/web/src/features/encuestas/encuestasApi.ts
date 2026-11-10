import { api } from '@/lib/api'
import type { Paginado } from '@/lib/tipos'

export interface ProcesoPublico {
  id: string
  nombre: string
}

export interface RespuestaEncuestaDto {
  calificacionGeneral: number
  atencionPersonal: number
  tiempoEspera: number
  limpieza: number
  recomendaria?: boolean
  comentario?: string
}

export interface EncuestaFila {
  id: string
  procesoId: string
  calificacionGeneral: number
  atencionPersonal: number
  tiempoEspera: number
  limpieza: number
  recomendaria: boolean | null
  comentario: string | null
  creadoAt: string
  proceso: { id: string; codigo: string; nombre: string }
}

export interface ResumenProcesoEncuesta {
  proceso: { id: string; codigo: string; nombre: string } | null
  total: number
  promedioGeneral: number | null
  promedioAtencion: number | null
  promedioEspera: number | null
  promedioLimpieza: number | null
  ultimaRespuestaAt: string | null
}

export interface ResumenEncuestas {
  total: number
  promedioGeneral: number | null
  porProceso: ResumenProcesoEncuesta[]
}

/** Endpoints públicos (sin sesión), usados desde el enlace que llena el paciente. */
export const encuestasPublicasApi = {
  async obtenerProceso(procesoId: string): Promise<ProcesoPublico> {
    const { data } = await api.get(`/encuestas/publico/${procesoId}`)
    return data
  },
  async responder(procesoId: string, dto: RespuestaEncuestaDto): Promise<{ id: string }> {
    const { data } = await api.post(`/encuestas/publico/${procesoId}`, dto)
    return data
  },
}

/** Endpoints administrativos (requieren el permiso encuestas.ver). */
export const encuestasApi = {
  async listar(params: { procesoId?: string; calificacionMax?: number; pagina?: number }): Promise<Paginado<EncuestaFila>> {
    const { data } = await api.get('/encuestas', { params })
    return data
  },
  async resumen(): Promise<ResumenEncuestas> {
    const { data } = await api.get('/encuestas/resumen')
    return data
  },
}
