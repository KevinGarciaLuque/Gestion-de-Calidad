import { Spin } from 'antd'

/** Pantalla de espera mientras se descarga el código de una ruta (code-splitting). */
export function Cargando() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
      <Spin size="large" />
    </div>
  )
}
