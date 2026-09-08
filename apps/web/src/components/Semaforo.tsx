import { Tooltip } from 'antd'
import { semaforo, type EstadoSemaforo } from '@/app/theme'

const COLOR: Record<EstadoSemaforo, string> = {
  verde: semaforo.verde,
  amarillo: semaforo.amarillo,
  rojo: semaforo.rojo,
  gris: semaforo.gris,
}

const ETIQUETA: Record<EstadoSemaforo, string> = {
  verde: 'Conforme',
  amarillo: 'Atención',
  rojo: 'Urgente',
  gris: 'Sin evaluar',
}

export function SemaforoDot({
  estado,
  motivos = [],
  size = 12,
}: {
  estado: EstadoSemaforo
  motivos?: string[]
  size?: number
}) {
  const dot = (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: COLOR[estado],
        flexShrink: 0,
      }}
    />
  )
  const texto = motivos.length ? motivos.join(' · ') : ETIQUETA[estado]
  return <Tooltip title={texto}>{dot}</Tooltip>
}
