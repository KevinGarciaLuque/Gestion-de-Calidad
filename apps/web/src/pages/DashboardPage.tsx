import { Card, Col, Empty, Row, Statistic, Tag, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { semaforo } from '@/app/theme'

const { Title, Paragraph } = Typography

interface Health {
  status: string
  db: string
  uptime: number
  timestamp: string
}

export function DashboardPage() {
  const { data, isError } = useQuery({
    queryKey: ['health'],
    queryFn: async () => (await api.get<Health>('/health')).data,
  })

  return (
    <>
      <Title level={3} style={{ marginTop: 0 }}>
        Panel de calidad
      </Title>
      <Paragraph type="secondary">
        Aquí vivirá el tablero gerencial: cumplimiento de KPI, riesgos críticos, auditorías
        pendientes, no conformidades abiertas, acciones vencidas y el radar de calidad. Se construye
        en la Fase 10.
      </Paragraph>

      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Estado de la API"
              value={isError ? 'sin conexión' : (data?.status ?? '…')}
              valueStyle={{
                color: isError ? semaforo.rojo : data?.status === 'ok' ? semaforo.verde : semaforo.amarillo,
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Base de datos"
              value={isError ? 'error' : (data?.db ?? '…')}
              valueStyle={{ color: data?.db === 'ok' ? semaforo.verde : semaforo.rojo }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Uptime API (s)" value={data?.uptime ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div style={{ marginBottom: 8, color: 'rgba(0,0,0,0.45)' }}>Semáforo institucional</div>
            <Tag color={semaforo.verde}>Conforme</Tag>
            <Tag color={semaforo.amarillo}>Atención</Tag>
            <Tag color={semaforo.rojo}>Urgente</Tag>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }}>
        <Empty description="Los módulos del SGC se irán habilitando fase por fase." />
      </Card>
    </>
  )
}
