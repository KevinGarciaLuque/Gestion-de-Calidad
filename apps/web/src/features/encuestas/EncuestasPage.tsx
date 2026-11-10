import { useState } from 'react'
import { CopyOutlined, LinkOutlined, SmileOutlined } from '@ant-design/icons'
import { App, Card, Col, Empty, Flex, Rate, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { procesosApi } from '@/features/procesos/procesosApi'
import { encuestasApi, type EncuestaFila } from './encuestasApi'

const { Title, Text, Paragraph } = Typography

export function EncuestasPage() {
  const { message } = App.useApp()
  const [procesoFiltro, setProcesoFiltro] = useState<string | undefined>()
  const [procesoEnlace, setProcesoEnlace] = useState<string | undefined>()
  const [pagina, setPagina] = useState(1)

  const { data: procesos } = useQuery({
    queryKey: ['procesos-para-encuestas'],
    queryFn: () => procesosApi.listar({ estado: 'VIGENTE', pagina: 1, porPagina: 100 }),
  })

  const { data: resumen } = useQuery({
    queryKey: ['encuestas-resumen'],
    queryFn: () => encuestasApi.resumen(),
  })

  const { data: lista, isFetching } = useQuery({
    queryKey: ['encuestas-lista', { procesoFiltro, pagina }],
    queryFn: () => encuestasApi.listar({ procesoId: procesoFiltro, pagina }),
  })

  const enlace = procesoEnlace ? `${window.location.origin}/encuestas/responder/${procesoEnlace}` : null

  function copiarEnlace() {
    if (!enlace) return
    void navigator.clipboard?.writeText(enlace)
    message.success('Enlace copiado')
  }

  const columnas: ColumnsType<EncuestaFila> = [
    {
      title: 'Fecha',
      dataIndex: 'creadoAt',
      width: 110,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY'),
    },
    { title: 'Proceso', dataIndex: ['proceso', 'nombre'] },
    {
      title: 'General',
      dataIndex: 'calificacionGeneral',
      width: 130,
      render: (v: number) => <Rate disabled value={v} style={{ fontSize: 14 }} />,
      sorter: (a, b) => a.calificacionGeneral - b.calificacionGeneral,
    },
    { title: 'Atención', dataIndex: 'atencionPersonal', width: 90, align: 'center' },
    { title: 'Espera', dataIndex: 'tiempoEspera', width: 90, align: 'center' },
    { title: 'Limpieza', dataIndex: 'limpieza', width: 90, align: 'center' },
    {
      title: 'Recomienda',
      dataIndex: 'recomendaria',
      width: 110,
      render: (v: boolean | null) => (v == null ? '—' : <Tag color={v ? 'success' : 'error'}>{v ? 'Sí' : 'No'}</Tag>),
    },
    { title: 'Comentario', dataIndex: 'comentario', ellipsis: true, render: (v: string | null) => v ?? '—' },
  ]

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Encuestas de satisfacción
          </Title>
          <Text type="secondary">Respuestas de pacientes a la encuesta de satisfacción por proceso</Text>
        </div>
      </Flex>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Respuestas recibidas" value={resumen?.total ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Promedio general"
              value={resumen?.promedioGeneral ?? undefined}
              precision={1}
              suffix="/ 5"
              prefix={<SmileOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 20 }}>
        <Title level={5} style={{ marginTop: 0 }}>
          <LinkOutlined /> Generar enlace de encuesta
        </Title>
        <Paragraph type="secondary">
          Elige el proceso o área y comparte el enlace con el paciente (impreso, por QR o en un
          mensaje). No requiere iniciar sesión.
        </Paragraph>
        <Space wrap>
          <Select
            placeholder="Selecciona un proceso"
            style={{ width: 320 }}
            value={procesoEnlace}
            onChange={setProcesoEnlace}
            options={procesos?.datos.map((p) => ({ value: p.id, label: `${p.codigo} — ${p.nombre}` }))}
            showSearch
            optionFilterProp="label"
          />
          {enlace && (
            <Space.Compact>
              <input
                readOnly
                value={enlace}
                style={{ width: 340, padding: '4px 11px', borderRadius: '6px 0 0 6px', border: '1px solid #d9d9d9' }}
                onFocus={(e) => e.currentTarget.select()}
              />
              <a onClick={copiarEnlace} style={{ border: '1px solid #d9d9d9', borderLeft: 'none', borderRadius: '0 6px 6px 0', padding: '4px 12px', background: '#fafafa' }}>
                <CopyOutlined />
              </a>
            </Space.Compact>
          )}
        </Space>
      </Card>

      {resumen && resumen.porProceso.length > 0 && (
        <Card style={{ marginBottom: 20 }} title="Promedio por proceso">
          <Row gutter={[16, 16]}>
            {resumen.porProceso.map((r) => (
              <Col xs={24} sm={12} md={8} key={r.proceso?.id}>
                <Card size="small">
                  <Text strong>{r.proceso?.nombre ?? 'Proceso eliminado'}</Text>
                  <div style={{ marginTop: 6 }}>
                    <Rate disabled allowHalf value={r.promedioGeneral ?? 0} style={{ fontSize: 14 }} />
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      {r.promedioGeneral ?? '—'} / 5 · {r.total} respuesta{r.total === 1 ? '' : 's'}
                    </Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      <Flex gap={12} wrap style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="Filtrar por proceso"
          style={{ width: 280 }}
          value={procesoFiltro}
          onChange={(v) => { setPagina(1); setProcesoFiltro(v) }}
          options={procesos?.datos.map((p) => ({ value: p.id, label: `${p.codigo} — ${p.nombre}` }))}
          showSearch
          optionFilterProp="label"
        />
      </Flex>

      <Table<EncuestaFila>
        rowKey="id"
        columns={columnas}
        dataSource={lista?.datos}
        loading={isFetching}
        locale={{ emptyText: <Empty description="Todavía no hay respuestas" /> }}
        pagination={{ current: pagina, pageSize: lista?.porPagina ?? 20, total: lista?.total ?? 0, onChange: setPagina, showSizeChanger: false }}
        scroll={{ x: 900 }}
      />
    </>
  )
}
