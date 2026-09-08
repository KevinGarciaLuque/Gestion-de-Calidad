import { useState } from 'react'
import {
  App,
  Button,
  Flex,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Tabs,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DownloadOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/features/auth/useAuth'
import { DocumentoFormModal } from './DocumentoFormModal'
import {
  descargarArchivo,
  documentosApi,
  ETIQUETA_TIPO_DOC,
  type DocumentoFila,
  type FilaListaMaestra,
  type TipoDocumento,
} from './documentosApi'

const { Title, Text } = Typography

export function DocumentosPage() {
  const navigate = useNavigate()
  const { puede } = useAuth()
  const [crear, setCrear] = useState(false)

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Control documental
          </Title>
          <Text type="secondary">Documentación del SGC con versiones, vigencias y aprobación</Text>
        </div>
        {puede('documentos.crear') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCrear(true)}>
            Nuevo documento
          </Button>
        )}
      </Flex>

      <Tabs
        items={[
          { key: 'docs', label: 'Documentos', children: <ListaDocumentos /> },
          { key: 'maestra', label: 'Lista maestra', children: <ListaMaestra /> },
        ]}
      />

      {crear && (
        <DocumentoFormModal
          onClose={() => setCrear(false)}
          onGuardado={(id) => {
            setCrear(false)
            navigate(`/documentos/${id}`)
          }}
        />
      )}
    </>
  )
}

function ListaDocumentos() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState<TipoDocumento | undefined>()
  const [estado, setEstado] = useState<string | undefined>()
  const [soloAlerta, setSoloAlerta] = useState(false)
  const [pagina, setPagina] = useState(1)

  const { data, isFetching } = useQuery({
    queryKey: ['documentos', { q, tipo, estado, soloAlerta, pagina }],
    queryFn: () =>
      documentosApi.listar({
        q: q || undefined,
        tipo,
        estado,
        soloConAlerta: soloAlerta || undefined,
        pagina,
      }),
  })

  const columnas: ColumnsType<DocumentoFila> = [
    {
      title: 'Documento',
      dataIndex: 'nombre',
      render: (n: string, d) => (
        <Space direction="vertical" size={0}>
          <Text strong>{n}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {d.codigo} · {ETIQUETA_TIPO_DOC[d.tipo]}
            {d.proceso ? ` · ${d.proceso.codigo}` : ' · institucional'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Versión vigente',
      key: 'v',
      width: 130,
      render: (_, d) =>
        d.versionVigente ? (
          <Tag color="green">v{d.versionVigente}</Tag>
        ) : (
          <Text type="secondary">Sin publicar</Text>
        ),
    },
    {
      title: 'Próxima revisión',
      dataIndex: 'proximaRevisionAt',
      width: 140,
      render: (v: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : '—'),
    },
    {
      title: 'Estado',
      key: 'e',
      render: (_, d) => (
        <Space size={[4, 4]} wrap>
          {d.estadoTrabajo === 'BORRADOR' && <Tag>Borrador</Tag>}
          {d.estadoTrabajo === 'EN_REVISION' && <Tag color="gold">En revisión</Tag>}
          {d.alerta.revisionVencida && <Tag color="volcano">Revisión vencida</Tag>}
          {d.alerta.revisionProxima && <Tag color="gold">Revisión próxima</Tag>}
          {d.alerta.sinVigente && <Tag color="blue">Sin versión vigente</Tag>}
          {d.restringido && <Tag>Restringido</Tag>}
        </Space>
      ),
    },
  ]

  return (
    <>
      <Flex gap={12} wrap style={{ marginBottom: 16 }}>
        <Input.Search allowClear placeholder="Buscar por nombre, código o palabra clave" style={{ maxWidth: 320 }}
          onSearch={(v) => { setPagina(1); setQ(v) }} />
        <Select allowClear placeholder="Tipo" style={{ width: 170 }} value={tipo} onChange={(v) => { setPagina(1); setTipo(v) }}
          options={(Object.keys(ETIQUETA_TIPO_DOC) as TipoDocumento[]).map((t) => ({ value: t, label: ETIQUETA_TIPO_DOC[t] }))} />
        <Select allowClear placeholder="Estado" style={{ width: 170 }} value={estado} onChange={(v) => { setPagina(1); setEstado(v) }}
          options={[
            { value: 'VIGENTE', label: 'Con versión vigente' },
            { value: 'SIN_VIGENTE', label: 'Sin versión vigente' },
            { value: 'EN_REVISION', label: 'En revisión' },
            { value: 'BORRADOR', label: 'En borrador' },
            { value: 'ARCHIVADO', label: 'Archivados' },
          ]} />
        <Select style={{ width: 160 }} value={soloAlerta ? 'a' : 't'} onChange={(v) => { setPagina(1); setSoloAlerta(v === 'a') }}
          options={[{ value: 't', label: 'Todos' }, { value: 'a', label: 'Solo con alerta' }]} />
      </Flex>

      <Table<DocumentoFila>
        rowKey="id"
        columns={columnas}
        dataSource={data?.datos}
        loading={isFetching}
        onRow={(r) => ({ onClick: () => navigate(`/documentos/${r.id}`), style: { cursor: 'pointer' } })}
        pagination={{ current: pagina, pageSize: data?.porPagina ?? 20, total: data?.total ?? 0, onChange: setPagina, showSizeChanger: false }}
        scroll={{ x: 820 }}
      />
    </>
  )
}

function ListaMaestra() {
  const { data, isFetching } = useQuery({ queryKey: ['lista-maestra'], queryFn: documentosApi.listaMaestra })

  const columnas: ColumnsType<FilaListaMaestra> = [
    { title: 'Código', dataIndex: 'codigo', width: 130 },
    { title: 'Nombre', dataIndex: 'nombre' },
    { title: 'Tipo', dataIndex: 'tipo', width: 130, render: (t: TipoDocumento) => ETIQUETA_TIPO_DOC[t] },
    { title: 'Ver.', dataIndex: 'version', width: 60 },
    {
      title: 'Proceso',
      key: 'p',
      width: 110,
      render: (_, d) => d.proceso?.codigo ?? <Text type="secondary">—</Text>,
    },
    {
      title: 'Vigente desde',
      dataIndex: 'fechaVigenciaDesde',
      width: 130,
      render: (v: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : '—'),
    },
    {
      title: 'Próxima revisión',
      dataIndex: 'proximaRevisionAt',
      width: 140,
      render: (v: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : '—'),
    },
  ]

  return (
    <>
      <Text type="secondary">
        Documentos con versión vigente. {data?.length ?? 0} en total.
      </Text>
      <Table<FilaListaMaestra>
        style={{ marginTop: 12 }}
        rowKey="id"
        size="small"
        loading={isFetching}
        columns={columnas}
        dataSource={data}
        pagination={false}
        scroll={{ x: 900 }}
      />
    </>
  )
}

export { descargarArchivo }
export function BotonDescarga({
  documentoId,
  versionId,
  nombre,
  texto = 'Descargar',
}: {
  documentoId: string
  versionId: string
  nombre: string
  texto?: string
}) {
  const { message } = App.useApp()
  return (
    <Button
      icon={<DownloadOutlined />}
      onClick={async (e) => {
        e.stopPropagation()
        try {
          await descargarArchivo(documentoId, versionId, nombre)
        } catch (err) {
          message.error(mensajeDeError(err, 'No se pudo descargar'))
        }
      }}
    >
      {texto}
    </Button>
  )
}
