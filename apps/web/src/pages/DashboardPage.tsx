import {
  AlertOutlined,
  ArrowRightOutlined,
  AuditOutlined,
  FileTextOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Alert, Card, Col, Empty, Flex, Row, Skeleton, Statistic, Tag, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Link, useNavigate } from 'react-router-dom'
import { semaforo } from '@/app/theme'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/features/auth/useAuth'
import { ETIQUETA_ESTADO_ACCION } from '@/features/acciones/accionesApi'
import { ETIQUETA_ESTADO_HALLAZGO } from '@/features/hallazgos/hallazgosApi'
import { dashboardApi, type NivelRadar } from '@/features/dashboard/dashboardApi'
import { BarraApilada, Dona } from '@/features/dashboard/Charts'

const { Title, Text, Paragraph } = Typography

const COLOR_ESTADO_HALLAZGO: Record<string, string> = {
  ABIERTO: '#ff7a45',
  EN_ANALISIS: '#ffa940',
  PLAN_APROBADO: '#40a9ff',
  EN_EJECUCION: '#1677ff',
  PENDIENTE_EFICACIA: '#9254de',
  CERRADO: semaforo.verde,
  REABIERTO: semaforo.rojo,
}
const COLOR_ESTADO_ACCION: Record<string, string> = {
  PENDIENTE: '#ffa940',
  EN_CURSO: '#1677ff',
  COMPLETADA: '#9254de',
  VERIFICADA: semaforo.verde,
  CANCELADA: semaforo.gris,
}
const COLOR_RADAR: Record<NivelRadar, string> = {
  URGENTE: semaforo.rojo,
  AVISO: semaforo.amarillo,
  INFO: '#1677ff',
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.resumen,
    refetchInterval: 5 * 60_000,
  })

  return (
    <>
      <Flex justify="space-between" align="baseline" wrap gap={8} style={{ marginBottom: 4 }}>
        <Title level={3} style={{ margin: 0 }}>
          Panel de calidad
        </Title>
        {data && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Actualizado {dayjs(data.generadoAt).format('DD/MM/YYYY HH:mm')}
          </Text>
        )}
      </Flex>
      <Paragraph type="secondary" style={{ marginTop: 0 }}>
        {usuario?.nombre ? `Hola, ${usuario.nombre}. ` : ''}Situación del Sistema de Gestión de Calidad
        {data ? ` — ejercicio ${data.anio}` : ''}.
      </Paragraph>

      {error && <Alert type="error" showIcon message={mensajeDeError(error)} style={{ marginBottom: 16 }} />}

      {isLoading || !data ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <>
          {/* ── Tarjetas de prioridad ─────────────────────────────────── */}
          <Row gutter={[16, 16]}>
            <TarjetaKpi
              titulo="Cumplimiento de KPI"
              valor={data.indicadores.cumplimientoPct == null ? '—' : `${data.indicadores.cumplimientoPct}%`}
              detalle={`${data.indicadores.dentroDeMeta}/${data.indicadores.conMedicion} dentro de meta`}
              color={
                data.indicadores.cumplimientoPct == null
                  ? undefined
                  : data.indicadores.cumplimientoPct >= 85
                    ? semaforo.verde
                    : data.indicadores.cumplimientoPct >= 60
                      ? semaforo.amarillo
                      : semaforo.rojo
              }
              icono={<ThunderboltOutlined />}
              onClick={() => navigate('/indicadores')}
            />
            <TarjetaKpi
              titulo="Indicadores fuera de meta"
              valor={data.indicadores.fueraDeMeta}
              detalle={`${data.indicadores.capturaPendiente} con captura pendiente`}
              color={data.indicadores.fueraDeMeta > 0 ? semaforo.amarillo : semaforo.verde}
              icono={<WarningOutlined />}
              onClick={() => navigate('/indicadores')}
            />
            <TarjetaKpi
              titulo="Riesgos críticos"
              valor={data.riesgos.criticos}
              detalle={`${data.riesgos.criticosSinTratamiento} sin tratamiento`}
              color={data.riesgos.criticosSinTratamiento > 0 ? semaforo.rojo : semaforo.amarillo}
              icono={<WarningOutlined />}
              onClick={() => navigate('/riesgos')}
            />
            <TarjetaKpi
              titulo="Auditorías del año"
              valor={data.auditorias.delAnio}
              detalle={`${data.auditorias.ejecutadas} ejecutadas · ${data.auditorias.planificadas} pendientes`}
              color={semaforo.gris}
              icono={<AuditOutlined />}
              onClick={() => navigate('/auditorias')}
            />
            <TarjetaKpi
              titulo="No conformidades abiertas"
              valor={data.hallazgos.abiertos}
              detalle={`${data.hallazgos.vencidos} vencidas · ${data.hallazgos.cerradosPeriodo} cerradas este año`}
              color={data.hallazgos.vencidos > 0 ? semaforo.rojo : semaforo.amarillo}
              icono={<SafetyOutlined />}
              onClick={() => navigate('/hallazgos')}
            />
            <TarjetaKpi
              titulo="Acciones vencidas"
              valor={data.acciones.vencidas}
              detalle={`${data.acciones.abiertas} abiertas · ${data.acciones.esperaVerificacion} por verificar`}
              color={data.acciones.vencidas > 0 ? semaforo.rojo : semaforo.verde}
              icono={<ThunderboltOutlined />}
              onClick={() => navigate('/acciones')}
            />
            <TarjetaKpi
              titulo="Documentos por revisar"
              valor={data.documentos.porRevisar30d + data.documentos.vencidos}
              detalle={`${data.documentos.vencidos} vencidos · próximos 30 días`}
              color={data.documentos.vencidos > 0 ? semaforo.rojo : semaforo.amarillo}
              icono={<FileTextOutlined />}
              onClick={() => navigate('/documentos')}
            />
            <TarjetaKpi
              titulo="Mejora continua"
              valor={data.mcc.enEjecucion}
              detalle={`${data.mcc.nuevos} por evaluar · ${data.mcc.cerrados} cerradas`}
              color={semaforo.gris}
              icono={<ThunderboltOutlined />}
              onClick={() => navigate('/mcc')}
            />
          </Row>

          {/* ── Radar de calidad ──────────────────────────────────────── */}
          <Card
            style={{ marginTop: 16 }}
            title={
              <Flex align="center" gap={8}>
                <AlertOutlined />
                Radar de calidad
              </Flex>
            }
          >
            {data.radar.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Sin alertas prioritarias. Todo bajo control."
              />
            ) : (
              <Flex vertical gap={8}>
                {data.radar.map((a, i) => (
                  <Flex
                    key={i}
                    align="center"
                    gap={12}
                    onClick={() => navigate(a.ruta)}
                    style={{
                      cursor: 'pointer',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #f0f0f0',
                      borderLeft: `3px solid ${COLOR_RADAR[a.nivel]}`,
                    }}
                  >
                    <Tag color={COLOR_RADAR[a.nivel]} style={{ marginInlineEnd: 0 }}>
                      {a.nivel}
                    </Tag>
                    <Text style={{ flex: 1 }}>{a.texto}</Text>
                    <ArrowRightOutlined style={{ color: '#bfbfbf' }} />
                  </Flex>
                ))}
              </Flex>
            )}
          </Card>

          {/* ── Gráficos ──────────────────────────────────────────────── */}
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} md={12} lg={6}>
              <Card title="Semáforo de indicadores" size="small" style={{ height: '100%' }}>
                <Dona
                  total={data.indicadores.conMedicion}
                  etiquetaCentro="medidos"
                  datos={[
                    { nombre: 'En meta', valor: data.indicadores.semaforo.verde, color: semaforo.verde },
                    { nombre: 'En alerta', valor: data.indicadores.semaforo.amarillo, color: semaforo.amarillo },
                    { nombre: 'Fuera de meta', valor: data.indicadores.semaforo.rojo, color: semaforo.rojo },
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} md={12} lg={6}>
              <Card title="Riesgos por categoría" size="small" style={{ height: '100%' }}>
                <Dona
                  total={data.riesgos.total}
                  etiquetaCentro="riesgos"
                  datos={[
                    { nombre: 'Bajo', valor: data.riesgos.porCategoria.BAJO, color: semaforo.verde },
                    { nombre: 'Medio', valor: data.riesgos.porCategoria.MEDIO, color: semaforo.amarillo },
                    { nombre: 'Alto', valor: data.riesgos.porCategoria.ALTO, color: '#fa541c' },
                    { nombre: 'Crítico', valor: data.riesgos.porCategoria.CRITICO, color: semaforo.rojo },
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Hallazgos por estado" size="small" style={{ marginBottom: 16 }}>
                <BarraApilada
                  datos={Object.entries(data.hallazgos.porEstado).map(([k, v]) => ({
                    nombre: ETIQUETA_ESTADO_HALLAZGO[k as keyof typeof ETIQUETA_ESTADO_HALLAZGO] ?? k,
                    valor: v,
                    color: COLOR_ESTADO_HALLAZGO[k] ?? semaforo.gris,
                  }))}
                />
              </Card>
              <Card title="Acciones por estado" size="small">
                <BarraApilada
                  datos={Object.entries(data.acciones.porEstado).map(([k, v]) => ({
                    nombre: ETIQUETA_ESTADO_ACCION[k as keyof typeof ETIQUETA_ESTADO_ACCION] ?? k,
                    valor: v,
                    color: COLOR_ESTADO_ACCION[k] ?? semaforo.gris,
                  }))}
                />
              </Card>
            </Col>
          </Row>

          <Text type="secondary" style={{ display: 'block', marginTop: 16, fontSize: 12 }}>
            ¿Necesitas un informe para imprimir o enviar? Ve a{' '}
            <Link to="/reportes">Reportes</Link>.
          </Text>
        </>
      )}
    </>
  )
}

function TarjetaKpi({
  titulo,
  valor,
  detalle,
  color,
  icono,
  onClick,
}: {
  titulo: string
  valor: string | number
  detalle: string
  color?: string
  icono: React.ReactNode
  onClick: () => void
}) {
  return (
    <Col xs={24} sm={12} lg={6}>
      <Card hoverable onClick={onClick} style={{ height: '100%' }} styles={{ body: { padding: 16 } }}>
        <Flex justify="space-between" align="flex-start">
          <Statistic title={titulo} value={valor} valueStyle={{ color, fontSize: 26 }} />
          <span style={{ color: color ?? '#bfbfbf', fontSize: 18 }}>{icono}</span>
        </Flex>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {detalle}
        </Text>
      </Card>
    </Col>
  )
}
