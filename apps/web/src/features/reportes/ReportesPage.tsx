import { DownloadOutlined, EyeOutlined, FilePdfOutlined, PrinterOutlined } from '@ant-design/icons'
import { App, Button, Card, Col, Drawer, Flex, Row, Table, Typography } from 'antd'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { descargarReporteCsv, reportesApi, type ReporteDatos } from './reportesApi'

const { Title, Text, Paragraph } = Typography

export function ReportesPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [vista, setVista] = useState<ReporteDatos | null>(null)

  const catalogo = useQuery({ queryKey: ['reportes', 'catalogo'], queryFn: reportesApi.catalogo })

  const abrir = useMutation({
    mutationFn: reportesApi.datos,
    onSuccess: (d) => setVista(d),
    onError: (e) => message.error(mensajeDeError(e)),
  })
  const descargar = useMutation({
    mutationFn: ({ tipo, nombre }: { tipo: string; nombre: string }) => descargarReporteCsv(tipo, nombre),
    onError: (e) => message.error(mensajeDeError(e)),
  })

  return (
    <>
      <Title level={3} style={{ marginTop: 0 }}>
        Reportes y salidas
      </Title>
      <Paragraph type="secondary">
        Documentos listos para revisión, impresión o envío. Los listados se pueden descargar en CSV para
        analizar en Excel.
      </Paragraph>

      <Card
        style={{ marginBottom: 16, background: '#f6ffed', borderColor: '#b7eb8f' }}
        styles={{ body: { padding: 16 } }}
      >
        <Flex justify="space-between" align="center" wrap gap={12}>
          <div>
            <Text strong>
              <FilePdfOutlined /> Informe ejecutivo de calidad
            </Text>
            <div>
              <Text type="secondary">
                Resumen consolidado de indicadores, riesgos, auditorías, hallazgos y acciones para la
                revisión por la dirección.
              </Text>
            </div>
          </div>
          <Button type="primary" icon={<PrinterOutlined />} onClick={() => navigate('/reportes/ejecutivo')}>
            Abrir informe imprimible
          </Button>
        </Flex>
      </Card>

      <Row gutter={[16, 16]}>
        {catalogo.data?.map((r) => (
          <Col xs={24} md={12} lg={8} key={r.tipo}>
            <Card size="small" style={{ height: '100%' }} title={r.titulo}>
              <Paragraph type="secondary" style={{ minHeight: 44 }}>
                {r.descripcion}
              </Paragraph>
              <Flex gap={8} wrap>
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  loading={abrir.isPending && abrir.variables === r.tipo}
                  onClick={() => abrir.mutate(r.tipo)}
                >
                  Ver
                </Button>
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  loading={descargar.isPending && descargar.variables?.tipo === r.tipo}
                  onClick={() => descargar.mutate({ tipo: r.tipo, nombre: r.titulo })}
                >
                  CSV
                </Button>
              </Flex>
            </Card>
          </Col>
        ))}
      </Row>

      <Drawer
        open={!!vista}
        onClose={() => setVista(null)}
        width="min(1100px, 96vw)"
        title={vista?.titulo}
        extra={
          vista && (
            <Button
              icon={<DownloadOutlined />}
              onClick={() => descargar.mutate({ tipo: vista.tipo, nombre: vista.titulo })}
            >
              Descargar CSV
            </Button>
          )
        }
      >
        {vista && (
          <>
            <Text type="secondary">
              {vista.filas.length} registro{vista.filas.length === 1 ? '' : 's'} · generado{' '}
              {dayjs(vista.generadoAt).format('DD/MM/YYYY HH:mm')}
            </Text>
            <Table
              style={{ marginTop: 12 }}
              size="small"
              rowKey={(_, i) => String(i)}
              dataSource={vista.filas}
              columns={vista.columnas.map((c) => ({
                title: c.label,
                dataIndex: c.key,
                ellipsis: true,
              }))}
              pagination={{ pageSize: 25, showSizeChanger: false, hideOnSinglePage: true }}
              scroll={{ x: 'max-content' }}
            />
          </>
        )}
      </Drawer>
    </>
  )
}
