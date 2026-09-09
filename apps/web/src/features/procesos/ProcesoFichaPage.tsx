import { useState } from 'react'
import {
  App,
  Breadcrumb,
  Button,
  Descriptions,
  Flex,
  Input,
  Segmented,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { SemaforoDot } from '@/components/Semaforo'
import { ETIQUETA_TIPO_PROCESO, procesosApi, type FichaPayload, type VersionFicha } from './procesosApi'
import { FichaEditor } from './FichaEditor'
import { FichaVista } from './FichaVista'
import { IdentificacionModal } from './IdentificacionModal'
import { InteraccionesTab } from './InteraccionesTab'
import { ProcesoIndicadoresTab } from './ProcesoIndicadoresTab'
import { ProcesoRiesgosTab } from '@/features/riesgos/ProcesoRiesgosTab'
import { ProcesoDocumentosTab } from '@/features/documentos/ProcesoDocumentosTab'

const { Title, Text } = Typography

const ESTADO_VERSION_TAG: Record<string, { color: string; texto: string }> = {
  BORRADOR: { color: 'default', texto: 'Borrador' },
  EN_REVISION: { color: 'gold', texto: 'En revisión' },
  APROBADA: { color: 'green', texto: 'Aprobada' },
  OBSOLETA: { color: 'default', texto: 'Obsoleta' },
}

function aFichaPayload(v: VersionFicha): FichaPayload {
  return {
    alcance: v.alcance,
    entradas: v.entradas ?? [],
    actividades: v.actividades ?? [],
    salidas: v.salidas ?? [],
    recursos: v.recursos ?? [],
    notas: v.notas ?? undefined,
  }
}

export function ProcesoFichaPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { message, modal } = App.useApp()
  const [editando, setEditando] = useState(false)
  const [verIdent, setVerIdent] = useState(false)
  const [verVigente, setVerVigente] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['proceso', id],
    queryFn: () => procesosApi.obtener(id),
  })

  const refrescar = () => {
    void qc.invalidateQueries({ queryKey: ['proceso', id] })
    void qc.invalidateQueries({ queryKey: ['procesos-mapa'] })
  }
  const onMut = (fn: Promise<unknown>) =>
    fn.then(refrescar).catch((e) => message.error(mensajeDeError(e)))

  const guardarFicha = useMutation({
    mutationFn: (v: FichaPayload) => procesosApi.guardarFicha(id, v),
    onSuccess: () => {
      message.success('Borrador guardado')
      setEditando(false)
      refrescar()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  if (isLoading) return <Spin />
  if (isError || !data) return <Text type="danger">No se pudo cargar el proceso.</Text>

  const { proceso, versionTrabajo, versionVigente, historial, puede } = data
  const versionMostrada =
    verVigente && versionVigente ? versionVigente : (versionTrabajo ?? versionVigente)
  const hayBorradorEditable = versionTrabajo?.estado === 'BORRADOR' && puede.editar
  const enRevision = versionTrabajo?.estado === 'EN_REVISION'

  const proponerCambios = () => {
    if (!versionVigente) return
    onMut(procesosApi.guardarFicha(id, aFichaPayload(versionVigente)).then(() => setEditando(true)))
  }

  const acciones: React.ReactNode[] = []
  if (!editando) {
    if (hayBorradorEditable) {
      acciones.push(
        <Button key="edit" onClick={() => setEditando(true)}>
          Editar ficha
        </Button>,
        <Button
          key="send"
          type="primary"
          onClick={() =>
            modal.confirm({
              title: 'Enviar la ficha a revisión de Calidad',
              onOk: () => onMut(procesosApi.enviarRevision(id)),
            })
          }
        >
          Enviar a revisión
        </Button>,
      )
    } else if (!versionTrabajo && versionVigente && puede.editar) {
      acciones.push(
        <Button key="propose" onClick={proponerCambios}>
          Proponer cambios
        </Button>,
      )
    }
    if (enRevision && puede.revisar) {
      acciones.push(
        <Button
          key="return"
          onClick={() => {
            let comentario = ''
            modal.confirm({
              title: 'Devolver al responsable',
              content: (
                <Input.TextArea
                  rows={3}
                  placeholder="Motivo / observaciones"
                  onChange={(e) => (comentario = e.target.value)}
                />
              ),
              okText: 'Devolver',
              onOk: () => onMut(procesosApi.devolver(id, comentario || undefined)),
            })
          }}
        >
          Devolver
        </Button>,
      )
    }
    if (enRevision && puede.aprobar) {
      acciones.push(
        <Button
          key="approve"
          type="primary"
          onClick={() =>
            modal.confirm({
              title: 'Aprobar y publicar esta versión',
              content: 'La versión vigente actual quedará como histórica.',
              okText: 'Aprobar',
              onOk: () => onMut(procesosApi.aprobar(id)),
            })
          }
        >
          Aprobar
        </Button>,
      )
    }
    if (puede.archivar) {
      const archivado = proceso.estado === 'ARCHIVADO'
      acciones.push(
        <Button
          key="arch"
          danger={!archivado}
          onClick={() => onMut(procesosApi.archivar(id, !archivado))}
        >
          {archivado ? 'Desarchivar' : 'Archivar'}
        </Button>,
      )
    }
  }

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 12 }}
        items={[
          { title: <Link to="/procesos">Mapa de procesos</Link> },
          { title: proceso.codigo },
        ]}
      />

      <Flex justify="space-between" align="flex-start" wrap gap={12} style={{ marginBottom: 16 }}>
        <Space align="start">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/procesos')} />
          <div>
            <Space align="center" size={8}>
              <SemaforoDot estado={proceso.semaforo.estado} motivos={proceso.semaforo.motivos} size={14} />
              <Title level={4} style={{ margin: 0 }}>
                {proceso.nombre}
              </Title>
            </Space>
            <Space size={6} wrap style={{ marginTop: 4 }}>
              <Tag>{proceso.codigo}</Tag>
              <Tag color="blue">{ETIQUETA_TIPO_PROCESO[proceso.tipo]}</Tag>
              <Tag color={proceso.estado === 'VIGENTE' ? 'green' : proceso.estado === 'ARCHIVADO' ? 'red' : 'default'}>
                {proceso.estado}
              </Tag>
              {proceso.proximaRevisionAt && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Próxima revisión: {dayjs(proceso.proximaRevisionAt).format('DD/MM/YYYY')}
                </Text>
              )}
            </Space>
          </div>
        </Space>
        <Space wrap>{acciones}</Space>
      </Flex>

      <Tabs
        items={[
          {
            key: 'ident',
            label: 'Identificación',
            children: (
              <>
                <Flex justify="flex-end" style={{ marginBottom: 8 }}>
                  {puede.editar && <Button onClick={() => setVerIdent(true)}>Editar</Button>}
                </Flex>
                <Descriptions bordered size="small" column={1}>
                  <Descriptions.Item label="Objetivo">{proceso.objetivo}</Descriptions.Item>
                  <Descriptions.Item label="Tipo">{ETIQUETA_TIPO_PROCESO[proceso.tipo]}</Descriptions.Item>
                  <Descriptions.Item label="Área responsable">
                    {proceso.area?.nombre ?? <Text type="secondary">Sin asignar</Text>}
                  </Descriptions.Item>
                  <Descriptions.Item label="Dueño del proceso">
                    {proceso.responsable?.nombre ?? <Text type="secondary">Sin asignar</Text>}
                  </Descriptions.Item>
                  <Descriptions.Item label="Suplente">
                    {proceso.suplente?.nombre ?? <Text type="secondary">Sin asignar</Text>}
                  </Descriptions.Item>
                </Descriptions>
              </>
            ),
          },
          {
            key: 'ficha',
            label: 'Ficha de caracterización',
            children: (
              <>
                {versionTrabajo && versionVigente && !editando && (
                  <Segmented
                    style={{ marginBottom: 12 }}
                    value={verVigente ? 'vigente' : 'trabajo'}
                    onChange={(v) => setVerVigente(v === 'vigente')}
                    options={[
                      { value: 'trabajo', label: `Borrador v${versionTrabajo.numero}` },
                      { value: 'vigente', label: `Vigente v${versionVigente.numero}` },
                    ]}
                  />
                )}
                {!versionMostrada ? (
                  <Text type="secondary">Este proceso aún no tiene ficha.</Text>
                ) : editando && hayBorradorEditable ? (
                  <FichaEditor
                    inicial={aFichaPayload(versionTrabajo!)}
                    guardando={guardarFicha.isPending}
                    onGuardar={(v) => guardarFicha.mutate(v)}
                    onCancelar={() => setEditando(false)}
                  />
                ) : (
                  <>
                    <Space style={{ marginBottom: 12 }}>
                      <Text strong>Versión {versionMostrada.numero}</Text>
                      <Tag color={ESTADO_VERSION_TAG[versionMostrada.estado]?.color}>
                        {ESTADO_VERSION_TAG[versionMostrada.estado]?.texto}
                      </Tag>
                    </Space>
                    <FichaVista version={versionMostrada} />
                  </>
                )}
              </>
            ),
          },
          {
            key: 'indicadores',
            label: 'Indicadores',
            children: <ProcesoIndicadoresTab procesoId={proceso.id} />,
          },
          {
            key: 'riesgos',
            label: 'Riesgos',
            children: <ProcesoRiesgosTab procesoId={proceso.id} />,
          },
          {
            key: 'documentos',
            label: 'Documentos',
            children: <ProcesoDocumentosTab procesoId={proceso.id} />,
          },
          {
            key: 'interacciones',
            label: `Interacciones (${data.relaciones.length})`,
            children: <InteraccionesTab detalle={data} onCambio={refrescar} />,
          },
          {
            key: 'historial',
            label: 'Historial',
            children: (
              <Table
                size="small"
                rowKey="id"
                scroll={{ x: 'max-content' }}
                pagination={false}
                dataSource={historial}
                columns={[
                  { title: 'Versión', dataIndex: 'numero', width: 90 },
                  {
                    title: 'Estado',
                    dataIndex: 'estado',
                    render: (e: string) => (
                      <Tag color={ESTADO_VERSION_TAG[e]?.color}>{ESTADO_VERSION_TAG[e]?.texto}</Tag>
                    ),
                  },
                  {
                    title: 'Propuesta por',
                    dataIndex: ['propuestaPor', 'nombre'],
                    render: (v: string) => v ?? '—',
                  },
                  {
                    title: 'Aprobada',
                    dataIndex: 'aprobadaAt',
                    render: (v: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : '—'),
                  },
                  {
                    title: 'Creada',
                    dataIndex: 'creadoAt',
                    render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
                  },
                ]}
              />
            ),
          },
        ]}
      />

      {verIdent && (
        <IdentificacionModal
          detalle={data}
          onClose={() => setVerIdent(false)}
          onGuardado={() => {
            setVerIdent(false)
            refrescar()
          }}
        />
      )}
    </>
  )
}
