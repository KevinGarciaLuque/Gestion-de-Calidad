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
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { CategoriaTag } from './categoria'
import { EditarRiesgoModal } from './EditarRiesgoModal'
import { ReevaluarModal } from './ReevaluarModal'
import {
  ETIQUETA_EFICACIA,
  ETIQUETA_ESTADO,
  riesgosApi,
  type RiesgoDetalle,
} from './riesgosApi'

const { Title, Text, Paragraph } = Typography

export function RiesgoDetallePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { message, modal } = App.useApp()
  const [editar, setEditar] = useState(false)
  const [reevaluar, setReevaluar] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['riesgo', id],
    queryFn: () => riesgosApi.obtener(id),
  })

  const refrescar = () => {
    void qc.invalidateQueries({ queryKey: ['riesgo', id] })
    void qc.invalidateQueries({ queryKey: ['riesgos'] })
    void qc.invalidateQueries({ queryKey: ['mapa-calor'] })
  }
  const run = (p: Promise<unknown>) => p.then(refrescar).catch((e) => message.error(mensajeDeError(e)))

  if (isLoading) return <Spin />
  if (isError || !data) return <Text type="danger">No se pudo cargar el riesgo.</Text>

  const { riesgo: r, revisiones, puede } = data
  const abierto = r.estado !== 'CERRADO'
  const esOportunidad = r.tipo === 'OPORTUNIDAD'

  const acciones: React.ReactNode[] = []
  if (puede.editar && abierto) {
    acciones.push(
      <Button key="e" onClick={() => setEditar(true)}>
        Editar
      </Button>,
      <Button key="rv" onClick={() => setReevaluar(true)}>
        Reevaluar (residual)
      </Button>,
      <Button
        key="r"
        onClick={() =>
          modal.confirm({
            title: 'Registrar revisión sin cambios',
            content: 'Se deja constancia de la revisión y se reprograma la próxima.',
            onOk: () => run(riesgosApi.revisar(id, {})),
          })
        }
      >
        Revisar
      </Button>,
    )
  }
  if (puede.cerrar) {
    acciones.push(
      abierto ? (
        <Button
          key="c"
          type="primary"
          onClick={() => {
            let comentario = ''
            modal.confirm({
              title: `Cerrar ${r.codigo}`,
              content: (
                <Input.TextArea
                  rows={3}
                  placeholder="Justificación del cierre"
                  onChange={(e) => (comentario = e.target.value)}
                />
              ),
              okText: 'Cerrar riesgo',
              onOk: () => run(riesgosApi.cerrar(id, comentario)),
            })
          }}
        >
          Cerrar
        </Button>
      ) : (
        <Button key="ra" onClick={() => run(riesgosApi.reabrir(id))}>
          Reabrir
        </Button>
      ),
    )
  }
  if (puede.archivar) {
    acciones.push(
      <Button key="ar" danger={!r.archivado} onClick={() => run(riesgosApi.archivar(id, !r.archivado))}>
        {r.archivado ? 'Desarchivar' : 'Archivar'}
      </Button>,
    )
  }

  const colsRev: ColumnsType<RiesgoDetalle['revisiones'][number]> = [
    { title: 'Fecha', dataIndex: 'fecha', width: 150, render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm') },
    { title: 'Tipo', dataIndex: 'esResidual', width: 120, render: (v: boolean) => (v ? 'Reevaluación' : 'Revisión') },
    {
      title: 'Nivel',
      key: 'n',
      width: 130,
      render: (_, rev) =>
        rev.nivel != null ? (
          <Space>
            {rev.nivel}
            <CategoriaTag categoria={rev.categoria} tipo={r.tipo} />
          </Space>
        ) : (
          '—'
        ),
    },
    { title: 'Por', dataIndex: ['revisadoPor', 'nombre'], render: (v: string) => v ?? '—' },
    { title: 'Comentario', dataIndex: 'comentario', render: (v: string) => v ?? '—' },
  ]

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 12 }}
        items={[{ title: <Link to="/riesgos">Riesgos</Link> }, { title: r.codigo }]}
      />

      <Flex justify="space-between" align="flex-start" wrap gap={12} style={{ marginBottom: 16 }}>
        <Space align="start">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/riesgos')} />
          <div style={{ maxWidth: 640 }}>
            <Title level={4} style={{ margin: 0 }}>
              {r.descripcion}
            </Title>
            <Space size={6} wrap style={{ marginTop: 6 }}>
              <Tag>{r.codigo}</Tag>
              <Tag color={esOportunidad ? 'green' : 'default'}>
                {esOportunidad ? 'Oportunidad' : 'Riesgo'}
              </Tag>
              <Link to={`/procesos/${r.proceso.id}`}>
                <Tag color="blue">{r.proceso.codigo}</Tag>
              </Link>
              <Tag>{ETIQUETA_ESTADO[r.estado]}</Tag>
              {r.archivado && <Tag color="red">Archivado</Tag>}
            </Space>
          </div>
        </Space>
        <Space wrap>{acciones}</Space>
      </Flex>

      {(r.alerta.faltaTratamiento || r.alerta.requiereReevaluacion || r.alerta.revisionVencida || r.alerta.planVencido) && (
        <div style={{ marginBottom: 16 }}>
          <Space size={[6, 6]} wrap>
            {r.alerta.faltaTratamiento && <Tag color="red">Falta responsable o plan de tratamiento</Tag>}
            {r.alerta.planVencido && <Tag color="red">Plan de tratamiento vencido</Tag>}
            {r.alerta.revisionVencida && <Tag color="volcano">Revisión vencida</Tag>}
            {r.alerta.requiereReevaluacion && <Tag color="blue">Se solicitó reevaluación</Tag>}
            {r.alerta.sinResidual && <Tag color="gold">Sin nivel residual</Tag>}
          </Space>
        </div>
      )}

      <Tabs
        items={[
          {
            key: 'eval',
            label: 'Evaluación',
            children: (
              <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
                <Descriptions.Item label="Causa">{r.causa ?? <Text type="secondary">—</Text>}</Descriptions.Item>
                <Descriptions.Item label="Consecuencia">
                  {r.consecuencia ?? <Text type="secondary">—</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Probabilidad inherente">{r.probabilidadInherente}</Descriptions.Item>
                <Descriptions.Item label="Impacto inherente">{r.impactoInherente}</Descriptions.Item>
                <Descriptions.Item label="Nivel inherente">
                  <Space>
                    {r.nivelInherente}
                    <CategoriaTag categoria={r.categoriaInherente} tipo={r.tipo} />
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Nivel residual">
                  {r.nivelResidual != null ? (
                    <Space>
                      {r.nivelResidual}
                      <CategoriaTag categoria={r.categoriaResidual} tipo={r.tipo} />
                    </Space>
                  ) : (
                    <Text type="secondary">Pendiente de reevaluar</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Próxima revisión">
                  {r.fechaRevision ? dayjs(r.fechaRevision).format('DD/MM/YYYY') : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Última revisión">
                  {r.ultimaRevisionAt ? dayjs(r.ultimaRevisionAt).format('DD/MM/YYYY') : '—'}
                </Descriptions.Item>
              </Descriptions>
            ),
          },
          {
            key: 'trat',
            label: 'Tratamiento',
            children: (
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="Controles existentes">
                  {r.controles ?? <Text type="secondary">Sin registrar</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Eficacia del control">
                  {ETIQUETA_EFICACIA[r.eficaciaControl]}
                </Descriptions.Item>
                <Descriptions.Item label="Plan de tratamiento">
                  {r.planTratamiento ? (
                    <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{r.planTratamiento}</Paragraph>
                  ) : (
                    <Text type="secondary">Sin registrar</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Responsable">
                  {r.responsable?.nombre ?? <Text type="secondary">Sin asignar</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Fecha compromiso">
                  {r.fechaCompromiso ? dayjs(r.fechaCompromiso).format('DD/MM/YYYY') : '—'}
                </Descriptions.Item>
              </Descriptions>
            ),
          },
          {
            key: 'rev',
            label: `Revisiones (${revisiones.length})`,
            children: (
              <Table
                rowKey="id"
                size="small"
                columns={colsRev}
                dataSource={revisiones}
                pagination={false}
                scroll={{ x: 720 }}
              />
            ),
          },
        ]}
      />

      {editar && (
        <EditarRiesgoModal
          detalle={data}
          onClose={() => setEditar(false)}
          onGuardado={() => {
            setEditar(false)
            refrescar()
          }}
        />
      )}
      {reevaluar && (
        <ReevaluarModal
          detalle={data}
          onClose={() => setReevaluar(false)}
          onGuardado={() => {
            setReevaluar(false)
            refrescar()
          }}
        />
      )}
    </>
  )
}
