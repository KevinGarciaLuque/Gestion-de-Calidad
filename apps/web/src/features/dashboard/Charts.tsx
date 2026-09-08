import { Tooltip } from 'antd'

/** Dona de proporciones. `datos` = segmentos con valor y color; muestra total al centro. */
export function Dona({
  datos,
  total,
  etiquetaCentro,
  size = 132,
}: {
  datos: { nombre: string; valor: number; color: string }[]
  total?: number
  etiquetaCentro?: string
  size?: number
}) {
  const suma = datos.reduce((s, d) => s + d.valor, 0)
  const t = total ?? suma
  const r = size / 2
  const grosor = size * 0.16
  const radio = r - grosor / 2
  const circ = 2 * Math.PI * radio
  let acumulado = 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <svg width={size} height={size} role="img" aria-label="Distribución">
        <circle cx={r} cy={r} r={radio} fill="none" stroke="#f0f0f0" strokeWidth={grosor} />
        {suma > 0 &&
          datos.map((d) => {
            if (d.valor === 0) return null
            const frac = d.valor / suma
            const dash = frac * circ
            const el = (
              <circle
                key={d.nombre}
                cx={r}
                cy={r}
                r={radio}
                fill="none"
                stroke={d.color}
                strokeWidth={grosor}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={-acumulado * circ}
                transform={`rotate(-90 ${r} ${r})`}
              />
            )
            acumulado += frac
            return el
          })}
        <text x={r} y={r - 2} textAnchor="middle" fontSize={size * 0.26} fontWeight={700} fill="#262626">
          {t}
        </text>
        {etiquetaCentro && (
          <text x={r} y={r + size * 0.16} textAnchor="middle" fontSize={size * 0.1} fill="#8c8c8c">
            {etiquetaCentro}
          </text>
        )}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {datos.map((d) => (
          <div key={d.nombre} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, display: 'inline-block' }} />
            <span style={{ color: '#595959' }}>{d.nombre}</span>
            <span style={{ fontWeight: 600, marginLeft: 'auto' }}>{d.valor}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Barra horizontal apilada con leyenda debajo. */
export function BarraApilada({
  datos,
  alto = 22,
}: {
  datos: { nombre: string; valor: number; color: string }[]
  alto?: number
}) {
  const suma = datos.reduce((s, d) => s + d.valor, 0)
  if (suma === 0) return <div style={{ color: '#8c8c8c', fontSize: 13 }}>Sin datos.</div>

  return (
    <div>
      <div style={{ display: 'flex', height: alto, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
        {datos.map(
          (d) =>
            d.valor > 0 && (
              <Tooltip key={d.nombre} title={`${d.nombre}: ${d.valor}`}>
                <div style={{ flex: d.valor, background: d.color, minWidth: 3 }} />
              </Tooltip>
            ),
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 8 }}>
        {datos.map((d) => (
          <div key={d.nombre} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: d.color, display: 'inline-block' }} />
            <span style={{ color: '#595959' }}>{d.nombre}</span>
            <span style={{ fontWeight: 600 }}>{d.valor}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
