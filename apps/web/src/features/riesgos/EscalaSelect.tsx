import { Select } from 'antd'
import type { NivelEscala } from './riesgosApi'

export function EscalaSelect({
  escala,
  value,
  onChange,
}: {
  escala: NivelEscala[]
  value?: number
  onChange?: (v: number) => void
}) {
  return (
    <Select
      value={value}
      onChange={onChange}
      style={{ width: '100%' }}
      optionLabelProp="label"
      options={[...escala]
        .sort((a, b) => a.valor - b.valor)
        .map((n) => ({
          value: n.valor,
          label: `${n.valor}. ${n.etiqueta}`,
          title: n.descripcion,
        }))}
      optionRender={(opt) => (
        <div>
          <div>{opt.data.label}</div>
          {opt.data.title && (
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{opt.data.title}</div>
          )}
        </div>
      )}
    />
  )
}
