import { useState } from 'react'
import { App, AutoComplete, DatePicker, Flex, Input, Select, Space, Table, Tag, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EyeOutlined, PaperClipOutlined, WarningFilled } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/features/auth/useAuth'
import {
  ETIQUETA_ESTATUS,
  ETIQUETA_TIPO,
  mccApi,
  type CatalogosMCC,
  type EstatusControl,
  type FiltrosControl,
  type FilaControl,
} from './mccApi'

const { Text } = Typography

const SITUACIONES = [
  { value: 'VENCIDO', label: 'Plazo vencido' },
  { value: 'POR_VENCER', label: 'Por vencer (≤ 7 días)' },
  { value: 'PENDIENTE', label: 'ACyP pendiente' },
  { value: 'SEGUIMIENTO', label: 'ACyP en seguimiento' },
  { value: 'COMPLETADA', label: 'ACyP completada' },
  { value: 'VENCIDA', label: 'ACyP vencida' },
  { value: 'SIN_ACYP', label: 'Sin ACyP' },
]

export function MccControlTabla({
  filtros,
  catalogos,
  onVerRegistro,
}: {
  filtros: FiltrosControl
  catalogos?: CatalogosMCC
  onVerRegistro: (id: string) => void
}) {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const { puede } = useAuth()
  const editable = puede('mcc.gestionar')
  const [q, setQ] = useState('')
  const [estatus, setEstatus] = useState<EstatusControl | undefined>()
  const [situacion, setSituacion] = useState<string | undefined>()
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(25)

  // Al cambiar los filtros del tablero se vuelve a la primera página.
  const claveFiltros = JSON.stringify(filtros)
  const [clavePrevia, setClavePrevia] = useState(claveFiltros)
  if (clavePrevia !== claveFiltros) {
    setClavePrevia(claveFiltros)
    setPagina(1)
  }

  const { data, isFetching } = useQuery({
    queryKey: ['mcc', 'control', { filtros, q, estatus, situacion, pagina, porPagina }],
    queryFn: () => mccApi.control({ ...filtros, q: q || undefined, estatus, situacion, pagina, porPagina }),
    placeholderData: (prev) => prev,
  })

  const guardar = useMutation({
    mutationFn: ({ id, cambio }: { id: string; cambio: Record<string, unknown> }) => mccApi.edicionRapida(id, cambio),
    onSuccess: () => {
      message.success({ content: 'Guardado', key: 'mcc-rapido', duration: 1.2 })
      void qc.invalidateQueries({ queryKey: ['mcc'] })
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })
  const set = (id: string, cambio: Record<string, unknown>) => guardar.mutate({ id, cambio })
  const fechaIso = (d: dayjs.Dayjs | null) => (d ? d.format('YYYY-MM-DD') : null)

  const opciones = (lista?: string[]) => (lista ?? []).map((v) => ({ value: v, label: v }))

  const columnas: ColumnsType<FilaControl> = [
    {
      title: 'ID / Código',
      key: 'codigo',
      width: 120,
      fixed: 'left',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <a onClick={() => onVerRegistro(r.id)} style={{ fontWeight: 600 }}>{r.codigo}</a>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.codigoTipo ?? 'S/C'}</Text>
        </Space>
      ),
    },
    {
      title: 'Tipo y hallazgo',
      key: 'tipo',
      width: 240,
      render: (_, r) => (
        <Space direction="vertical" size={0} style={{ maxWidth: 230 }}>
          <Text strong style={{ fontSize: 11 }}>
            {r.critico && (
              <Tooltip title="Registro crítico">
                <WarningFilled style={{ color: '#cf1322', marginRight: 4 }} />
              </Tooltip>
            )}
            {r.tipoRegistro ? ETIQUETA_TIPO[r.tipoRegistro].toUpperCase() : 'SIN CLASIFICAR'}
          </Text>
          <Tooltip title={r.descripcion}>
            <Text ellipsis style={{ maxWidth: 225, fontSize: 12 }}>{r.titulo}</Text>
          </Tooltip>
          <a onClick={() => onVerRegistro(r.id)} style={{ fontSize: 12 }}>
            <EyeOutlined /> Ver ficha
          </a>
        </Space>
      ),
    },
    {
      title: 'Fecha registro',
      dataIndex: 'fechaRecepcion',
      width: 140,
      render: (v: string, r) =>
        editable ? (
          <DatePicker size="small" format="DD/MM/YYYY" value={v ? dayjs(v) : null} allowClear={false}
            onChange={(d) => d && set(r.id, { fechaRecepcion: fechaIso(d) })} />
        ) : dayjs(v).format('DD/MM/YYYY'),
    },
    {
      title: 'Macroproceso',
      dataIndex: 'macroproceso',
      width: 170,
      render: (v: string | null, r) =>
        editable ? (
          <Select size="small" showSearch allowClear style={{ width: 160 }} value={v ?? undefined} placeholder="—"
            options={opciones(catalogos?.macroprocesos)} onChange={(x) => set(r.id, { macroproceso: x ?? null })} />
        ) : v ?? '—',
    },
    {
      title: 'Área responsable',
      dataIndex: 'areaResponsable',
      width: 180,
      render: (v: string | null, r) =>
        editable ? (
          <Select size="small" showSearch allowClear style={{ width: 170 }} value={v ?? undefined} placeholder="—"
            options={opciones(catalogos?.areas)} onChange={(x) => set(r.id, { areaResponsable: x ?? null })} />
        ) : v ?? '—',
    },
    {
      title: 'Responsable',
      dataIndex: 'responsableNombre',
      width: 170,
      render: (v: string | null, r) =>
        editable ? (
          <CeldaTexto key={v ?? ''} valor={v} opciones={catalogos?.responsables} onGuardar={(x) => set(r.id, { responsableNombre: x })} />
        ) : v ?? '—',
    },
    {
      title: 'Estatus',
      dataIndex: 'estatus',
      width: 160,
      render: (v: EstatusControl, r) =>
        editable ? (
          <Select size="small" style={{ width: 150, fontWeight: 600 }} value={v}
            options={(['ABIERTO', 'EN_SEGUIMIENTO', 'CERRADO', 'DESESTIMADO', 'SIN_ESTADO'] as EstatusControl[]).map((e) => ({
              value: e, label: ETIQUETA_ESTATUS[e].split(' /')[0].toUpperCase(),
            }))}
            onChange={(x) => set(r.id, { estatus: x })} />
        ) : ETIQUETA_ESTATUS[v],
    },
    {
      title: 'Fecha cierre real',
      dataIndex: 'fechaCierre',
      width: 140,
      render: (v: string | null, r) =>
        editable ? (
          <DatePicker size="small" format="DD/MM/YYYY" value={v ? dayjs(v) : null}
            onChange={(d) => set(r.id, { fechaCierre: fechaIso(d) })} />
        ) : v ? dayjs(v).format('DD/MM/YYYY') : '—',
    },
    {
      title: 'ACyP y situación',
      key: 'acyp',
      width: 160,
      render: (_, r) => <Situacion fila={r} />,
    },
    {
      title: 'Evidencia',
      dataIndex: 'tieneEvidencia',
      width: 85,
      align: 'center',
      render: (v: boolean) => (v ? <Tag icon={<PaperClipOutlined />} color="blue">SÍ</Tag> : <Tag>N/A</Tag>),
    },
  ]

  return (
    <>
      <Flex gap={12} wrap style={{ marginBottom: 12 }}>
        <Input.Search allowClear placeholder="ID, código, descripción, área…" style={{ width: 280 }}
          onSearch={(v) => { setPagina(1); setQ(v) }} />
        <Select allowClear placeholder="Estatus" style={{ width: 180 }} value={estatus}
          onChange={(v) => { setPagina(1); setEstatus(v) }}
          options={(Object.keys(ETIQUETA_ESTATUS) as EstatusControl[]).map((e) => ({ value: e, label: ETIQUETA_ESTATUS[e] }))} />
        <Select allowClear placeholder="Situación / ACyP" style={{ width: 200 }} value={situacion}
          onChange={(v) => { setPagina(1); setSituacion(v) }} options={SITUACIONES} />
        <Text type="secondary" style={{ alignSelf: 'center' }}>
          {data ? `${data.total} registros` : ''}
          {editable ? ' · los cambios se guardan al instante' : ''}
        </Text>
      </Flex>
      <Table<FilaControl>
        rowKey="id"
        size="small"
        columns={columnas}
        dataSource={data?.datos}
        loading={isFetching}
        scroll={{ x: 1500 }}
        pagination={{
          current: pagina, pageSize: porPagina, total: data?.total ?? 0, showSizeChanger: true, pageSizeOptions: [25, 50, 100],
          onChange: (p, s) => { setPagina(p); setPorPagina(s) },
        }}
      />
    </>
  )
}

/** Campo de texto que guarda al salir (o al pulsar Enter) solo si cambió. */
function CeldaTexto({ valor, opciones, onGuardar }: { valor: string | null; opciones?: string[]; onGuardar: (v: string | null) => void }) {
  const [texto, setTexto] = useState(valor ?? '') // el padre usa key={valor} para reiniciarlo
  const confirmar = () => {
    const v = texto.trim()
    if (v !== (valor ?? '')) onGuardar(v || null)
  }
  return (
    <AutoComplete
      size="small"
      style={{ width: 160 }}
      value={texto}
      options={(opciones ?? []).filter((o) => o.toLowerCase().includes(texto.toLowerCase())).slice(0, 20).map((o) => ({ value: o }))}
      onChange={setTexto}
      onBlur={confirmar}
      onSelect={(v: string) => { setTexto(v); if (v !== valor) onGuardar(v) }}
      onKeyDown={(e) => e.key === 'Enter' && confirmar()}
      placeholder="—"
    />
  )
}

function Situacion({ fila: r }: { fila: FilaControl }) {
  const p = r.plazo
  let tag: React.ReactNode
  if (r.estatus === 'DESESTIMADO') tag = <Tag>DESESTIMADO</Tag>
  else if (r.estatus === 'SIN_ESTADO') tag = <Tag>SIN DATO</Tag>
  else if (p.situacion === 'CERRADO') tag = <Tag color="success">CERRADO</Tag>
  else if (p.situacion === 'VENCIDO') tag = <Tag color="#a8071a">VENCIDO ({p.dias}d)</Tag>
  else if (p.situacion === 'POR_VENCER') tag = <Tag color="orange">VENCE EN {p.dias}d</Tag>
  else if (p.situacion === 'EN_PLAZO') tag = <Tag color="blue">EN PLAZO</Tag>
  else tag = <Tag>SIN FECHA LÍMITE</Tag>
  return (
    <Space direction="vertical" size={0}>
      {tag}
      <Text type="secondary" style={{ fontSize: 11 }}>
        {r.acyp ? `${r.acypCodigo ?? 'ACyP'}${r.cumplimiento !== null ? ` · ${r.cumplimiento}%` : ''}` : 'Sin ACyP'}
      </Text>
    </Space>
  )
}
