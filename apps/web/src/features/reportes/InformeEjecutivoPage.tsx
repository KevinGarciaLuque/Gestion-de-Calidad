import { ArrowLeftOutlined, FilePdfOutlined, PrinterOutlined } from '@ant-design/icons'
import { Button, Flex, Skeleton, Typography, message } from 'antd'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { semaforo } from '@/app/theme'
import { descargarInformeEjecutivoPdf, reportesApi } from './reportesApi'

const { Title, Text } = Typography

const ESTILOS_IMPRESION = `
@media print {
  .ant-layout-sider, .ant-layout-header, .informe-no-print { display: none !important; }
  .ant-layout, .ant-layout-content { margin: 0 !important; background: #fff !important; }
  .ant-layout-content > div { padding: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
  .informe-ejecutivo { max-width: none !important; }
}
.informe-ejecutivo table { width: 100%; border-collapse: collapse; margin: 8px 0 20px; font-size: 13px; }
.informe-ejecutivo th, .informe-ejecutivo td { border: 1px solid #d9d9d9; padding: 6px 10px; text-align: left; }
.informe-ejecutivo th { background: #fafafa; }
.informe-ejecutivo td.num { text-align: right; font-variant-numeric: tabular-nums; }
`

export function InformeEjecutivoPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({ queryKey: ['reporte-ejecutivo'], queryFn: reportesApi.ejecutivo })
  const [descargando, setDescargando] = useState(false)

  async function descargarPdf() {
    setDescargando(true)
    try {
      await descargarInformeEjecutivoPdf()
    } catch {
      message.error('No se pudo generar el PDF')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <>
      <style>{ESTILOS_IMPRESION}</style>

      <Flex justify="space-between" align="center" className="informe-no-print" style={{ marginBottom: 16 }} wrap="wrap" gap={8}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/reportes')}>
          Volver a reportes
        </Button>
        <Flex gap={8}>
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
            Imprimir
          </Button>
          <Button type="primary" icon={<FilePdfOutlined />} loading={descargando} onClick={descargarPdf}>
            Descargar PDF
          </Button>
        </Flex>
      </Flex>

      {isLoading || !data ? (
        <Skeleton active paragraph={{ rows: 12 }} />
      ) : (
        <div className="informe-ejecutivo" style={{ maxWidth: 900 }}>
          <div style={{ borderBottom: `3px solid ${'#00629b'}`, paddingBottom: 12, marginBottom: 20 }}>
            <Text style={{ color: '#00629b', fontWeight: 700, letterSpacing: 1 }}>
              {data.organizacion.toUpperCase()}
            </Text>
            <Title level={2} style={{ margin: '4px 0 0' }}>
              Informe ejecutivo de calidad
            </Title>
            <Text type="secondary">
              Ejercicio {data.anio} · generado el {dayjs(data.generadoAt).format('DD/MM/YYYY [a las] HH:mm')}
            </Text>
          </div>

          <Seccion titulo="1. Indicadores de desempeño (KPI)">
            <Tabla
              filas={[
                ['Indicadores activos', data.indicadores.total],
                ['Con medición registrada', data.indicadores.conMedicion],
                [
                  'Cumplimiento general',
                  data.indicadores.cumplimientoPct == null ? '—' : `${data.indicadores.cumplimientoPct}%`,
                ],
                ['Dentro de meta', data.indicadores.dentroDeMeta],
                ['En alerta (amarillo)', data.indicadores.semaforo.amarillo],
                ['Fuera de meta (rojo)', data.indicadores.semaforo.rojo],
                ['Con captura pendiente', data.indicadores.capturaPendiente],
              ]}
            />
          </Seccion>

          <Seccion titulo="2. Riesgos y oportunidades">
            <Tabla
              filas={[
                ['Riesgos registrados', data.riesgos.total],
                ['Nivel alto / crítico (abiertos)', data.riesgos.criticos],
                ['Críticos sin tratamiento definido', data.riesgos.criticosSinTratamiento],
                ['Con revisión vencida', data.riesgos.revisionVencida],
                ['Distribución', ''],
                ['  · Bajo', data.riesgos.porCategoria.BAJO],
                ['  · Medio', data.riesgos.porCategoria.MEDIO],
                ['  · Alto', data.riesgos.porCategoria.ALTO],
                ['  · Crítico', data.riesgos.porCategoria.CRITICO],
              ]}
            />
          </Seccion>

          <Seccion titulo="3. Auditorías">
            <Tabla
              filas={[
                ['Auditorías del ejercicio', data.auditorias.delAnio],
                ['Planificadas (pendientes)', data.auditorias.planificadas],
                ['En curso', data.auditorias.enCurso],
                ['Ejecutadas', data.auditorias.ejecutadas],
                ['Cerradas', data.auditorias.cerradas],
                [
                  'Cumplimiento del programa',
                  data.auditorias.cumplimientoPrograma == null
                    ? '—'
                    : `${data.auditorias.cumplimientoPrograma}%`,
                ],
              ]}
            />
          </Seccion>

          <Seccion titulo="4. Hallazgos y no conformidades">
            <Tabla
              filas={[
                ['Hallazgos abiertos', data.hallazgos.abiertos],
                ['No conformidades abiertas', data.hallazgos.noConformidadesAbiertas],
                ['Con compromiso vencido', data.hallazgos.vencidos],
                ['Cerrados en el ejercicio', data.hallazgos.cerradosPeriodo],
              ]}
            />
          </Seccion>

          <Seccion titulo="5. Planes de mejora y acciones">
            <Tabla
              filas={[
                ['Acciones abiertas', data.acciones.abiertas],
                ['Vencidas', data.acciones.vencidas],
                ['Por vencer (7 días)', data.acciones.porVencer],
                ['Completadas por verificar', data.acciones.esperaVerificacion],
                ['Mejora continua en ejecución', data.mcc.enEjecucion],
              ]}
            />
          </Seccion>

          <Seccion titulo="6. Control documental">
            <Tabla
              filas={[
                ['Documentos vigentes', data.documentos.vigentes],
                ['Con revisión vencida', data.documentos.vencidos],
                ['Por revisar en 30 días', data.documentos.porRevisar30d],
              ]}
            />
          </Seccion>

          <Seccion titulo="7. Radar de calidad — alertas prioritarias">
            {data.radar.length === 0 ? (
              <Text>No hay alertas prioritarias en este momento.</Text>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {data.radar.map((a, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    <b
                      style={{
                        color:
                          a.nivel === 'URGENTE'
                            ? semaforo.rojo
                            : a.nivel === 'AVISO'
                              ? semaforo.amarillo
                              : '#1677ff',
                      }}
                    >
                      [{a.nivel}]
                    </b>{' '}
                    {a.texto}
                  </li>
                ))}
              </ul>
            )}
          </Seccion>

          <div style={{ marginTop: 40, display: 'flex', gap: 60 }}>
            <FirmaLinea rol="Elaboró — Gestión de Calidad" />
            <FirmaLinea rol="Revisó — Dirección" />
          </div>
        </div>
      )}
    </>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Title level={4} style={{ marginBottom: 4 }}>
        {titulo}
      </Title>
      {children}
    </div>
  )
}

function Tabla({ filas }: { filas: [string, string | number][] }) {
  return (
    <table>
      <tbody>
        {filas.map(([k, v]) => (
          <tr key={k}>
            <td style={{ width: '65%' }}>{k}</td>
            <td className="num">{v === '' ? '' : v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function FirmaLinea({ rol }: { rol: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ borderTop: '1px solid #262626', paddingTop: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {rol}
        </Text>
      </div>
    </div>
  )
}
