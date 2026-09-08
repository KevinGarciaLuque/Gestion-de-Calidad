import { api } from '@/lib/api'

export type TipoEvento = 'AUDITORIA' | 'DOCUMENTO' | 'RIESGO' | 'ACCION' | 'HALLAZGO' | 'INDICADOR'

export interface EventoCalendario {
  fecha: string
  tipo: TipoEvento
  titulo: string
  ruta: string
  nivel: 'INFO' | 'AVISO' | 'URGENTE'
  vencido: boolean
}

export const ETIQUETA_TIPO_EVENTO: Record<TipoEvento, string> = {
  AUDITORIA: 'Auditoría',
  DOCUMENTO: 'Revisión documental',
  RIESGO: 'Revisión de riesgo',
  ACCION: 'Acción / compromiso',
  HALLAZGO: 'Compromiso de hallazgo',
  INDICADOR: 'Captura de indicador',
}

export const COLOR_TIPO_EVENTO: Record<TipoEvento, string> = {
  AUDITORIA: 'purple',
  DOCUMENTO: 'blue',
  RIESGO: 'volcano',
  ACCION: 'geekblue',
  HALLAZGO: 'orange',
  INDICADOR: 'cyan',
}

export const calendarioApi = {
  eventos: async (desde: string, hasta: string): Promise<EventoCalendario[]> =>
    (await api.get('/calendario', { params: { desde, hasta } })).data,
}
