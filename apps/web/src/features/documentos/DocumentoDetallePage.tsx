import { useState } from 'react'
import {
  App,
  Breadcrumb,
  Button,
  Descriptions,
  Flex,
  Input,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined, InboxOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { BotonDescarga } from './DocumentosPage'
import { DocumentoFormModal } from './DocumentoFormModal'
import { VersionMetadataModal } from './VersionMetadataModal'
import {
  documentosApi,
  ETIQUETA_TIPO_DOC,
  tamanoLegible,
  type VersionDoc,
} from './documentosApi'

const { Title, Text, Paragraph } = Typography

const TAG_ESTADO: Record<string, { color: string; texto: string }> = {
  BORRADOR: { color: 'default', texto: 'Borrador' },
  EN_REVISION: { color: 'gold', texto: 'En revisión' },
  VIGENTE: { color: 'green', texto: 'Vigente' },
  OBSOLETA: { color: 'default', texto: 'Obsoleta' },
}

export function DocumentoDetallePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { message, modal } = App.useApp()
  const [editar, setEditar] = useState(false)
  const [metadatos, setMetadatos] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['documento', id],
    queryFn: () => documentosApi.obtener(id),
  })

  const refrescar = () => {
    void qc.invalidateQueries({ queryKey: ['documento', id] })
    void qc.invalidateQueries({ queryKey: ['documentos'] })
    void qc.invalidateQueries({ queryKey: ['lista-maestra'] })
  }
  const run = (p: Promise<unknown>) => p.then(refrescar).catch((e) => message.error(mensajeDeError(e)))

  const subir = useMutation({
    mutationFn: (file: File) => documentosApi.subirArchivo(id, file),
    onSuccess: () => {
      message.success('Archivo subido')
      refrescar()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  if (isLoading) return <Spin />
  if (isError || !data) return <Text type="danger">No se pudo cargar el documento.</Text>

  const { documento: d, versionVigente, versionTrabajo, historial, puede } = data
  const borradorEditable = versionTrabajo?.estado === 'BORRADOR' && puede.editar
  const enRevision = versionTrabajo?.estado === 'EN_REVISION'

  const acciones: React.ReactNode[] = []
  if (puede.editar && !d.archivado) {
    if (versionTrabajo) {
      if (borradorEditable) {
        acciones.push(
          <Button key="m" onClick={() => setMetadatos(true)}>
            Datos de la versión
          </Button>,
          <Button
            key="s"
            type="primary"
            disabled={!versionTrabajo.archivo}
            onClick={() =>
              modal.confirm({
                title: 'Enviar a revisión de Calidad',
                onOk: () => run(documentosApi.enviarRevision(id)),
              })
            }
          >
            Enviar a revisión
          </Button>,
        )
      }
    } else {
      acciones.push(
        <Button key="p" onClick={() => run(documentosApi.guardarVersion(id, {}))}>
          Proponer nueva versión
        </Button>,
      )
    }
  }
  if (enRevision && puede.revisar) {
    acciones.push(
      <Button
        key="d"
        onClick={() => {
          let c = ''
          modal.confirm({
            title: 'Devolver al responsable',
            content: <Input.TextArea rows={3} placeholder="Observaciones" onChange={(e) => (c = e.target.value)} />,
            okText: 'Devolver',
            onOk: () => run(documentosApi.devolver(id, c || undefined)),
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
        key="a"
        type="primary"
        onClick={() =>
          modal.confirm({
            title: 'Aprobar y publicar esta versión',
            content: 'La versión vigente actual quedará como obsoleta.',
            okText: 'Aprobar',
            onOk: () => run(documentosApi.aprobar(id)),
          })
        }
      >
        Aprobar
      </Button>,
    )
  }
  if (puede.editar && !d.archivado) acciones.push(<Button key="e" onClick={() => setEditar(true)}>Editar ficha</Button>)
  if (puede.archivar)
    acciones.push(
      <Button key="ar" danger={!d.archivado} onClick={() => run(documentosApi.archivar(id, !d.archivado))}>
        {d.archivado ? 'Desarchivar' : 'Archivar'}
      </Button>,
    )

  const colsVer: ColumnsType<VersionDoc> = [
    { title: 'Ver.', dataIndex: 'numero', width: 60 },
    {
      title: 'Estado',
      dataIndex: 'estado',
      width: 110,
      render: (e: string) => <Tag color={TAG_ESTADO[e]?.color}>{TAG_ESTADO[e]?.texto}</Tag>,
    },
    { title: 'Motivo del cambio', dataIndex: 'motivoCambio', render: (v: string) => v ?? '—' },
    {
      title: 'Vigente desde',
      dataIndex: 'fechaVigenciaDesde',
      width: 120,
      render: (v: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : '—'),
    },
    {
      title: 'Aprobó',
      dataIndex: ['aprobador', 'nombre'],
      render: (v: string) => v ?? '—',
    },
    {
      title: 'Archivo',
      key: 'ar',
      width: 150,
      render: (_, v) =>
        v.archivo ? (
          <BotonDescarga documentoId={id} versionId={v.id} nombre={v.archivo.nombreOriginal} texto="Descargar" />
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
  ]

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 12 }}
        items={[{ title: <Link to="/documentos">Control documental</Link> }, { title: d.codigo }]}
      />

      <Flex justify="space-between" align="flex-start" wrap gap={12} style={{ marginBottom: 16 }}>
        <Space align="start">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/documentos')} />
          <div>
            <Title level={4} style={{ margin: 0 }}>
              {d.nombre}
            </Title>
            <Space size={6} wrap style={{ marginTop: 4 }}>
              <Tag>{d.codigo}</Tag>
              <Tag color="blue">{ETIQUETA_TIPO_DOC[d.tipo]}</Tag>
              {d.proceso && (
                <Link to={`/procesos/${d.proceso.id}`}>
                  <Tag>{d.proceso.codigo}</Tag>
                </Link>
              )}
              {versionVigente && <Tag color="green">Vigente v{versionVigente.numero}</Tag>}
              {d.restringido && <Tag>Restringido</Tag>}
              {d.archivado && <Tag color="red">Archivado</Tag>}
            </Space>
          </div>
        </Space>
        <Space wrap>{acciones}</Space>
      </Flex>

      {(d.alerta.revisionVencida || d.alerta.revisionProxima || d.alerta.sinVigente) && (
        <Space size={[6, 6]} wrap style={{ marginBottom: 16 }}>
          {d.alerta.revisionVencida && <Tag color="volcano">Revisión vencida</Tag>}
          {d.alerta.revisionProxima && <Tag color="gold">Revisión próxima (30 días)</Tag>}
          {d.alerta.sinVigente && <Tag color="blue">Sin versión vigente publicada</Tag>}
        </Space>
      )}

      <Tabs
        items={[
          {
            key: 'ficha',
            label: 'Ficha',
            children: (
              <>
                <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
                  <Descriptions.Item label="Tipo">{ETIQUETA_TIPO_DOC[d.tipo]}</Descriptions.Item>
                  <Descriptions.Item label="Proceso">
                    {d.proceso ? `${d.proceso.codigo} · ${d.proceso.nombre}` : 'Institucional'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Área">{d.area?.nombre ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Propietario">{d.propietario?.nombre ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Palabras clave">{d.palabrasClave ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Acceso">{d.restringido ? 'Restringido' : 'Normal'}</Descriptions.Item>
                  {versionVigente && (
                    <>
                      <Descriptions.Item label="Versión vigente">v{versionVigente.numero}</Descriptions.Item>
                      <Descriptions.Item label="Vigente desde">
                        {versionVigente.fechaVigenciaDesde
                          ? dayjs(versionVigente.fechaVigenciaDesde).format('DD/MM/YYYY')
                          : '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Próxima revisión">
                        {versionVigente.proximaRevisionAt
                          ? dayjs(versionVigente.proximaRevisionAt).format('DD/MM/YYYY')
                          : '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Aprobó">{versionVigente.aprobador?.nombre ?? '—'}</Descriptions.Item>
                    </>
                  )}
                </Descriptions>

                {versionVigente?.archivo && (
                  <div style={{ marginTop: 16 }}>
                    <Space>
                      <BotonDescarga
                        documentoId={id}
                        versionId={versionVigente.id}
                        nombre={versionVigente.archivo.nombreOriginal}
                        texto={`Descargar ${versionVigente.archivo.nombreOriginal}`}
                      />
                      <Text type="secondary">{tamanoLegible(versionVigente.archivo.tamanoBytes)}</Text>
                    </Space>
                  </div>
                )}
              </>
            ),
          },
          {
            key: 'versiones',
            label: `Versiones (${historial.length})`,
            children: (
              <>
                {borradorEditable && (
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>Borrador v{versionTrabajo!.numero}</Text>
                    {versionTrabajo!.comentarioRevision && (
                      <Paragraph type="warning" style={{ marginTop: 4 }}>
                        Devuelto: {versionTrabajo!.comentarioRevision}
                      </Paragraph>
                    )}
                    <Upload.Dragger
                      multiple={false}
                      showUploadList={false}
                      beforeUpload={(file) => {
                        subir.mutate(file as File)
                        return false
                      }}
                      style={{ marginTop: 8 }}
                    >
                      <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                      </p>
                      <p className="ant-upload-text">
                        {versionTrabajo!.archivo
                          ? `Archivo actual: ${versionTrabajo!.archivo.nombreOriginal} — arrastra otro para reemplazar`
                          : 'Arrastra el archivo del documento o haz clic'}
                      </p>
                      <p className="ant-upload-hint">PDF, Word, Excel, PowerPoint, imagen o texto. Máx. 25 MB.</p>
                    </Upload.Dragger>
                    {subir.isPending && <Spin style={{ marginTop: 8 }} />}
                  </div>
                )}

                <Table<VersionDoc>
                  rowKey="id"
                  size="small"
                  columns={colsVer}
                  dataSource={historial}
                  pagination={false}
                  scroll={{ x: 820 }}
                />
              </>
            ),
          },
        ]}
      />

      {editar && (
        <DocumentoFormModal
          documento={d}
          onClose={() => setEditar(false)}
          onGuardado={() => {
            setEditar(false)
            refrescar()
          }}
        />
      )}
      {metadatos && (
        <VersionMetadataModal
          detalle={data}
          onClose={() => setMetadatos(false)}
          onGuardado={() => {
            setMetadatos(false)
            refrescar()
          }}
        />
      )}
    </>
  )
}
