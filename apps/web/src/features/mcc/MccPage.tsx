import { useState } from 'react'
import { App, Button, Card, DatePicker, Flex, Form, Input, Modal, Select, Space, Table, Tabs, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  ClearOutlined,
  DashboardOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FilterFilled,
  PlusOutlined,
  TableOutlined,
  UnorderedListOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/features/auth/useAuth'
import {
  ETIQUETA_ESTATUS,
  ETIQUETA_ORIGEN_MCC,
  ETIQUETA_TIPO,
  exportarControlExcel,
  mccApi,
  TAG_ESTATUS,
  type EstadoMCC,
  type FiltrosControl,
  type MccFila,
  type OrigenMCC,
  type TipoRegistroMCC,
} from './mccApi'
import { MccTablero } from './MccTablero'
import { MccControlTabla } from './MccControlTabla'
import { MccRegistroForm } from './MccRegistroForm'
import { MccImportarModal } from './MccImportarModal'
import { InformeMccModal } from './InformeMccModal'

const { Title, Text } = Typography

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const TIPOS = Object.keys(ETIQUETA_TIPO).filter((t) => t !== 'SIN_CLASIFICAR') as TipoRegistroMCC[]

export function MccPage() {
  const navigate = useNavigate()
  const { puede } = useAuth()
  const gestiona = puede('mcc.gestionar')
  const [params, setParams] = useSearchParams()
  const vista = params.get('vista') ?? 'tablero'
  const [filtros, setFiltros] = useState<FiltrosControl>({})
  const [nuevo, setNuevo] = useState(false)
  const [proponer, setProponer] = useState(false)
  const [importar, setImportar] = useState(false)
  const [informe, setInforme] = useState(false)
  const [exportando, setExportando] = useState(false)
  const { message } = App.useApp()

  /** Exporta lo que se ve en el tablero (mismos filtros) con las columnas de la hoja original. */
  const exportar = async () => {
    setExportando(true)
    try {
      await exportarControlExcel(filtros)
    } catch {
      message.error('No se pudo exportar')
    } finally {
      setExportando(false)
    }
  }

  const { data: cat } = useQuery({ queryKey: ['mcc', 'catalogos'], queryFn: mccApi.catalogos, staleTime: 60_000 })
  const { data: tablero } = useQuery({
    queryKey: ['mcc', 'tablero', filtros],
    queryFn: () => mccApi.tablero(filtros),
    enabled: vista !== 'registros',
  })

  const filtrar = (f: Partial<FiltrosControl>) => setFiltros((prev) => ({ ...prev, ...f }))
  const verRegistro = (id: string) => navigate(`/mcc/${id}`)
  const hayFiltros = Object.values(filtros).some((v) => v !== undefined && v !== '')

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Mejora Continua de la Calidad <Tag color="gold" style={{ verticalAlign: 'middle' }}>CONTROL MCC</Tag>
          </Title>
          <Text type="secondary">
            No conformidades, salidas y entradas no conformes, quejas, felicitaciones y sugerencias
            {tablero?.ultimaActualizacion ? ` · última actualización ${dayjs(tablero.ultimaActualizacion).format('DD/MM/YYYY HH:mm')}` : ''}
          </Text>
        </div>
        <Space wrap>
          <Button icon={<FileExcelOutlined />} loading={exportando} onClick={exportar}>
            Exportar a Excel
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={() => setInforme(true)}>
            Informe PDF
          </Button>
          {gestiona && (
            <Button icon={<UploadOutlined />} onClick={() => setImportar(true)} style={{ background: '#fadb14', borderColor: '#fadb14', fontWeight: 600 }}>
              Importar CSV histórico
            </Button>
          )}
          {gestiona ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setNuevo(true)}>
              Nuevo registro
            </Button>
          ) : (
            puede('mcc.crear') && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setProponer(true)}>
                Proponer mejora
              </Button>
            )
          )}
        </Space>
      </Flex>

      {vista !== 'registros' && (
        <Card size="small" style={{ marginBottom: 16 }} title={<Space><FilterFilled style={{ color: '#d4a017' }} />Filtros dinámicos y vinculación por macroproceso</Space>}
          extra={hayFiltros && <Button size="small" icon={<ClearOutlined />} onClick={() => setFiltros({})}>Limpiar</Button>}>
          <Flex gap={12} wrap>
            <DatePicker.RangePicker
              format="DD/MM/YYYY"
              placeholder={['Desde', 'Hasta']}
              value={filtros.desde && filtros.hasta ? [dayjs(filtros.desde), dayjs(filtros.hasta)] : null}
              onChange={(r) => filtrar({ desde: r?.[0]?.format('YYYY-MM-DD'), hasta: r?.[1]?.format('YYYY-MM-DD') })}
            />
            <Select allowClear showSearch placeholder="Todos los macroprocesos" style={{ width: 220 }} value={filtros.macroproceso}
              options={(cat?.macroprocesos ?? []).map((m) => ({ value: m, label: m }))} onChange={(v) => filtrar({ macroproceso: v })} />
            <Select allowClear showSearch placeholder="Todas las áreas" style={{ width: 240 }} value={filtros.area}
              options={(cat?.areas ?? []).map((m) => ({ value: m, label: m }))} onChange={(v) => filtrar({ area: v })} />
            <Select allowClear placeholder="Mes" style={{ width: 130 }} value={filtros.mes}
              options={MESES.map((m, i) => ({ value: i + 1, label: m }))} onChange={(v) => filtrar({ mes: v })} />
            <Select allowClear placeholder="Tipo" style={{ width: 190 }} value={filtros.tipo}
              options={TIPOS.map((t) => ({ value: t, label: ETIQUETA_TIPO[t] }))} onChange={(v) => filtrar({ tipo: v })} />
          </Flex>
        </Card>
      )}

      <Tabs
        activeKey={vista}
        onChange={(k) => setParams(k === 'tablero' ? {} : { vista: k }, { replace: true })}
        items={[
          {
            key: 'tablero',
            label: <span><DashboardOutlined /> Dashboard y métricas</span>,
            children: <MccTablero filtros={filtros} onFiltrar={filtrar} onVerRegistro={verRegistro} />,
          },
          {
            key: 'control',
            label: <span><TableOutlined /> Control ACyP</span>,
            children: <MccControlTabla filtros={filtros} catalogos={cat} onVerRegistro={verRegistro} />,
          },
          {
            key: 'registros',
            label: <span><UnorderedListOutlined /> Registros y propuestas</span>,
            children: <ListaRegistros />,
          },
        ]}
      />

      <MccRegistroForm abierto={nuevo} onCerrar={() => setNuevo(false)} onGuardado={verRegistro} />
      <MccImportarModal abierto={importar} onCerrar={() => setImportar(false)} />
      <InformeMccModal abierto={informe} onCerrar={() => setInforme(false)} filtros={filtros} />
      <ProponerMejora abierto={proponer} onCerrar={() => setProponer(false)} />
    </>
  )
}

/** Listado general (incluye las propuestas de mejora de colaboradores). */
function ListaRegistros() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState<EstadoMCC | undefined>()
  const [pagina, setPagina] = useState(1)

  const { data, isFetching } = useQuery({
    queryKey: ['mcc', { q, estado, pagina }],
    queryFn: () => mccApi.listar({ q: q || undefined, estado, pagina }),
  })

  const columnas: ColumnsType<MccFila> = [
    {
      title: 'Registro',
      dataIndex: 'titulo',
      render: (t: string, m) => (
        <Space direction="vertical" size={0}>
          <Text strong>{t}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {m.codigo}
            {m.codigoTipo ? ` · ${m.codigoTipo}` : ''} · {m.tipoRegistro ? ETIQUETA_TIPO[m.tipoRegistro] : ETIQUETA_ORIGEN_MCC[m.origen]}
            {m.propuestoPor ? ` · ${m.propuestoPor.nombre}` : ''}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Área',
      key: 'area',
      width: 180,
      render: (_, m) => m.area?.nombre ?? m.areaResponsable ?? '—',
    },
    {
      title: 'Estatus',
      dataIndex: 'estatus',
      width: 160,
      render: (e: MccFila['estatus']) => <Tag color={TAG_ESTATUS[e]}>{ETIQUETA_ESTATUS[e]}</Tag>,
    },
    {
      title: 'Acciones',
      key: 'a',
      width: 90,
      render: (_, m) => (m.accionesTotal ? `${m.accionesCerradas}/${m.accionesTotal}` : '—'),
    },
    {
      title: 'Recepción',
      key: 'f',
      width: 110,
      render: (_, m) => dayjs(m.fechaRecepcion ?? m.creadoAt).format('DD/MM/YYYY'),
    },
  ]

  return (
    <>
      <Flex gap={12} wrap style={{ marginBottom: 16 }}>
        <Input.Search allowClear placeholder="Buscar" style={{ maxWidth: 260 }} onSearch={(v) => { setPagina(1); setQ(v) }} />
        <Select allowClear placeholder="Estado del flujo" style={{ width: 190 }} value={estado} onChange={(v) => { setPagina(1); setEstado(v) }}
          options={(['NUEVO', 'EN_REVISION', 'ACEPTADO', 'NO_PROCEDE', 'EN_EJECUCION', 'VERIFICACION', 'CERRADO', 'SIN_ESTADO'] as EstadoMCC[]).map((e) => ({
            value: e, label: e.replace('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()),
          }))} />
      </Flex>
      <Table<MccFila>
        rowKey="id"
        columns={columnas}
        dataSource={data?.datos}
        loading={isFetching}
        onRow={(r) => ({ onClick: () => navigate(`/mcc/${r.id}`), style: { cursor: 'pointer' } })}
        pagination={{ current: pagina, pageSize: data?.porPagina ?? 20, total: data?.total ?? 0, onChange: setPagina, showSizeChanger: false }}
        scroll={{ x: 800 }}
      />
    </>
  )
}

/** Formulario corto para que cualquier colaborador proponga una mejora. */
function ProponerMejora({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const crear = useMutation({
    mutationFn: (v: { titulo: string; descripcion: string; origen: OrigenMCC; origenDetalle?: string }) =>
      mccApi.crear({ ...v, tipoRegistro: 'SUGERENCIA' }),
    onSuccess: (det) => {
      message.success('Propuesta registrada')
      onCerrar()
      form.resetFields()
      void qc.invalidateQueries({ queryKey: ['mcc'] })
      navigate(`/mcc/${det.registro.id}`)
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })
  return (
    <Modal title="Proponer una mejora" open={abierto} onCancel={onCerrar} onOk={() => form.submit()} okText="Enviar propuesta"
      confirmLoading={crear.isPending} destroyOnClose>
      <Form form={form} layout="vertical" initialValues={{ origen: 'COLABORADOR' }} onFinish={(v) => crear.mutate(v)}>
        <Form.Item name="titulo" label="Título" rules={[{ required: true, min: 3 }]}>
          <Input />
        </Form.Item>
        <Form.Item name="descripcion" label="Descripción de la mejora" rules={[{ required: true, min: 5 }]}>
          <Input.TextArea rows={4} placeholder="Qué se propone mejorar y por qué" />
        </Form.Item>
        <Form.Item name="origen" label="Origen" rules={[{ required: true }]}>
          <Select options={(Object.keys(ETIQUETA_ORIGEN_MCC) as OrigenMCC[]).map((o) => ({ value: o, label: ETIQUETA_ORIGEN_MCC[o] }))} />
        </Form.Item>
        <Form.Item name="origenDetalle" label="Detalle del origen">
          <Input placeholder="Ej. Encuesta de servicio de Farmacia, junio" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
