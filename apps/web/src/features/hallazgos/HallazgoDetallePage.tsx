import { useState } from 'react'
import { Alert, Breadcrumb, Button, Descriptions, Flex, Space, Spin, Tag, Typography } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { HallazgoFormModal } from './HallazgoFormModal'
import { clasifColor } from './HallazgosPage'
import {
  ETIQUETA_CLASIFICACION,
  ETIQUETA_ESTADO_HALLAZGO,
  ETIQUETA_ORIGEN,
  hallazgosApi,
} from './hallazgosApi'

const { Title, Text, Paragraph } = Typography

export function HallazgoDetallePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [editar, setEditar] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['hallazgo', id],
    queryFn: () => hallazgosApi.obtener(id),
  })

  if (isLoading) return <Spin />
  if (isError || !data) return <Text type="danger">No se pudo cargar el hallazgo.</Text>

  const h = data.hallazgo

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 12 }}
        items={[{ title: <Link to="/hallazgos">Hallazgos</Link> }, { title: h.codigo }]}
      />

      <Flex justify="space-between" align="flex-start" wrap gap={12} style={{ marginBottom: 16 }}>
        <Space align="start">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/hallazgos')} />
          <div style={{ maxWidth: 640 }}>
            <Title level={4} style={{ margin: 0 }}>
              {h.descripcion}
            </Title>
            <Space size={6} wrap style={{ marginTop: 6 }}>
              <Tag>{h.codigo}</Tag>
              <Tag>{ETIQUETA_ORIGEN[h.origen]}</Tag>
              <Tag color={clasifColor(h.clasificacion)}>{ETIQUETA_CLASIFICACION[h.clasificacion]}</Tag>
              <Tag>{ETIQUETA_ESTADO_HALLAZGO[h.estado]}</Tag>
              {h.proceso && (
                <Link to={`/procesos/${h.proceso.id}`}>
                  <Tag color="blue">{h.proceso.codigo}</Tag>
                </Link>
              )}
              {h.auditoria && (
                <Link to={`/auditorias/${h.auditoria.id}`}>
                  <Tag>{h.auditoria.codigo}</Tag>
                </Link>
              )}
            </Space>
          </div>
        </Space>
        {data.puede.editar && <Button onClick={() => setEditar(true)}>Editar / dar seguimiento</Button>}
      </Flex>

      {(h.alerta.sinResponsable || h.alerta.planVencido) && (
        <Space size={[6, 6]} wrap style={{ marginBottom: 16 }}>
          {h.alerta.sinResponsable && <Tag color="red">Sin responsable asignado</Tag>}
          {h.alerta.planVencido && <Tag color="volcano">Fecha compromiso vencida</Tag>}
        </Space>
      )}

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Análisis de causa y plan de acción"
        description="El análisis de causa raíz (5 porqués / Ishikawa) y las acciones correctivas con verificación de eficacia se gestionan en las siguientes fases del sistema."
      />

      <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
        <Descriptions.Item label="Requisito relacionado" span={2}>
          {h.requisito ?? '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Evidencia objetiva" span={2}>
          {h.evidencia ? (
            <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{h.evidencia}</Paragraph>
          ) : (
            '—'
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Prioridad">{h.prioridad}</Descriptions.Item>
        <Descriptions.Item label="Detectado por">{h.detectadoPor?.nombre ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Responsable de respuesta">{h.responsable?.nombre ?? 'Sin asignar'}</Descriptions.Item>
        <Descriptions.Item label="Fecha compromiso">
          {h.fechaCompromiso ? dayjs(h.fechaCompromiso).format('DD/MM/YYYY') : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Fecha de detección">
          {dayjs(h.fechaDeteccion).format('DD/MM/YYYY')}
        </Descriptions.Item>
        <Descriptions.Item label="Área">{h.area?.nombre ?? '—'}</Descriptions.Item>
      </Descriptions>

      {editar && (
        <HallazgoFormModal
          hallazgo={h}
          onClose={() => setEditar(false)}
          onGuardado={() => {
            setEditar(false)
            void refetch()
          }}
        />
      )}
    </>
  )
}
