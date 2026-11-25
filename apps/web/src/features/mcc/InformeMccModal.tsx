import { useState } from 'react'
import { App, Checkbox, DatePicker, Flex, Modal, Radio, Typography } from 'antd'
import { useMutation } from '@tanstack/react-query'
import dayjs, { type Dayjs } from 'dayjs'
import { ETIQUETA_TIPO, descargarInformeMcc, type FiltrosControl } from './mccApi'

const { Text, Paragraph } = Typography

type Periodo = 'mes' | 'anio' | 'rango' | 'todo'

/**
 * Elige el periodo del informe PDF del Control MCC. Si viene `filtros` (desde el tablero),
 * ofrece aplicar también el macroproceso, el área y el tipo que estén seleccionados.
 */
export function InformeMccModal({ abierto, onCerrar, filtros }: { abierto: boolean; onCerrar: () => void; filtros?: FiltrosControl }) {
  const { message } = App.useApp()
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [mes, setMes] = useState<Dayjs>(dayjs())
  const [anio, setAnio] = useState<Dayjs>(dayjs())
  const [rango, setRango] = useState<[Dayjs, Dayjs] | null>(null)
  const [conFiltros, setConFiltros] = useState(true)

  const extra = [
    filtros?.macroproceso && `Macroproceso: ${filtros.macroproceso}`,
    filtros?.area && `Área: ${filtros.area}`,
    filtros?.tipo && `Tipo: ${ETIQUETA_TIPO[filtros.tipo]}`,
  ].filter(Boolean) as string[]

  const generar = useMutation({
    mutationFn: () => {
      const f: FiltrosControl = conFiltros && filtros ? { macroproceso: filtros.macroproceso, area: filtros.area, tipo: filtros.tipo } : {}
      let sufijo = 'historico'
      if (periodo === 'mes') {
        f.desde = mes.startOf('month').format('YYYY-MM-DD')
        f.hasta = mes.endOf('month').format('YYYY-MM-DD')
        sufijo = mes.format('YYYY-MM')
      } else if (periodo === 'anio') {
        f.desde = anio.startOf('year').format('YYYY-MM-DD')
        f.hasta = anio.endOf('year').format('YYYY-MM-DD')
        sufijo = anio.format('YYYY')
      } else if (periodo === 'rango' && rango) {
        f.desde = rango[0].format('YYYY-MM-DD')
        f.hasta = rango[1].format('YYYY-MM-DD')
        sufijo = `${f.desde}_${f.hasta}`
      }
      return descargarInformeMcc(f, sufijo)
    },
    onSuccess: () => {
      message.success('Informe generado')
      onCerrar()
    },
    onError: () => message.error('No se pudo generar el informe'),
  })

  return (
    <Modal
      title="Informe PDF del Control MCC"
      open={abierto}
      onCancel={onCerrar}
      onOk={() => generar.mutate()}
      okText="Descargar PDF"
      okButtonProps={{ disabled: periodo === 'rango' && !rango }}
      confirmLoading={generar.isPending}
    >
      <Paragraph type="secondary">
        Incluye el resumen (KPIs, costo de la no calidad, Safety Clock), el estado de las ACyP, los registros por tipo,
        la tendencia de 12 meses, el consolidado por macroproceso y área, y la lista de registros vencidos. Lleva espacio
        para las firmas de Calidad y de la Dirección.
      </Paragraph>
      <Radio.Group value={periodo} onChange={(e) => setPeriodo(e.target.value)} style={{ width: '100%' }}>
        <Flex vertical gap={10}>
          <Flex align="center" gap={8} wrap>
            <Radio value="mes">Mes</Radio>
            <DatePicker picker="month" format="MMMM YYYY" value={mes} allowClear={false} disabled={periodo !== 'mes'} onChange={(d) => d && setMes(d)} />
          </Flex>
          <Flex align="center" gap={8} wrap>
            <Radio value="anio">Año</Radio>
            <DatePicker picker="year" value={anio} allowClear={false} disabled={periodo !== 'anio'} onChange={(d) => d && setAnio(d)} />
          </Flex>
          <Flex align="center" gap={8} wrap>
            <Radio value="rango">Rango</Radio>
            <DatePicker.RangePicker format="DD/MM/YYYY" value={rango} disabled={periodo !== 'rango'}
              onChange={(r) => setRango(r && r[0] && r[1] ? [r[0], r[1]] : null)} />
          </Flex>
          <Radio value="todo">Todo el histórico</Radio>
        </Flex>
      </Radio.Group>
      {extra.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Checkbox checked={conFiltros} onChange={(e) => setConFiltros(e.target.checked)}>
            Aplicar los filtros del tablero
          </Checkbox>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>{extra.join(' · ')}</Text>
          </div>
        </div>
      )}
    </Modal>
  )
}
