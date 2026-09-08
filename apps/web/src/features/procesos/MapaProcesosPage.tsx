import { useState } from 'react'
import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/features/auth/useAuth'
import { SemaforoDot } from '@/components/Semaforo'
import {
  ETIQUETA_TIPO_PROCESO,
  procesosApi,
  type ProcesoResumen,
  type TipoProceso,
} from './procesosApi'

const { Title, Text } = Typography

export function MapaProcesosPage() {
  const navigate = useNavigate()
  const { puede } = useAuth()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [crear, setCrear] = useState(false)
  const [form] = Form.useForm()

  const { data, isFetching } = useQuery({ queryKey: ['procesos-mapa'], queryFn: procesosApi.mapa })

  const crearProceso = useMutation({
    mutationFn: procesosApi.crear,
    onSuccess: (detalle) => {
      setCrear(false)
      form.resetFields()
      void qc.invalidateQueries({ queryKey: ['procesos-mapa'] })
      navigate(`/procesos/${detalle.proceso.id}`)
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Mapa de procesos
          </Title>
          <Text type="secondary">Procesos estratégicos, misionales y de apoyo del SGC</Text>
        </div>
        {puede('procesos.crear') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCrear(true)}>
            Nuevo proceso
          </Button>
        )}
      </Flex>

      <Row gutter={16}>
        {(data ?? []).map((col) => (
          <Col key={col.tipo} xs={24} lg={8}>
            <Card
              title={ETIQUETA_TIPO_PROCESO[col.tipo]}
              loading={isFetching}
              styles={{ body: { minHeight: 120 } }}
            >
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                {col.procesos.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin procesos" />}
                {col.procesos.map((p) => (
                  <TarjetaProceso key={p.id} proceso={p} onClick={() => navigate(`/procesos/${p.id}`)} />
                ))}
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal
        title="Nuevo proceso"
        open={crear}
        onCancel={() => setCrear(false)}
        onOk={() => form.submit()}
        okText="Crear"
        confirmLoading={crearProceso.isPending}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ tipo: 'MISIONAL' }}
          onFinish={(v) => crearProceso.mutate(v)}
        >
          <Form.Item
            name="codigo"
            label="Código"
            rules={[
              { required: true, message: 'Ingresa un código' },
              { pattern: /^[A-Za-z0-9][A-Za-z0-9-]{1,29}$/, message: 'Código no válido' },
            ]}
          >
            <Input placeholder="PR-CAL-001" />
          </Form.Item>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, min: 3 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
            <Select
              options={(['ESTRATEGICO', 'MISIONAL', 'APOYO'] as TipoProceso[]).map((t) => ({
                value: t,
                label: ETIQUETA_TIPO_PROCESO[t],
              }))}
            />
          </Form.Item>
          <Form.Item
            name="objetivo"
            label="Objetivo"
            rules={[{ required: true, min: 3, message: 'Describe el objetivo del proceso' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

function TarjetaProceso({ proceso, onClick }: { proceso: ProcesoResumen; onClick: () => void }) {
  return (
    <Card size="small" hoverable onClick={onClick} styles={{ body: { padding: 12 } }}>
      <Flex justify="space-between" align="flex-start" gap={8}>
        <div style={{ minWidth: 0 }}>
          <Space size={6}>
            <SemaforoDot estado={proceso.semaforo.estado} motivos={proceso.semaforo.motivos} />
            <Text strong ellipsis style={{ maxWidth: 200 }}>
              {proceso.nombre}
            </Text>
          </Space>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {proceso.codigo}
              {proceso.responsable ? ` · ${proceso.responsable.nombre}` : ''}
            </Text>
          </div>
        </div>
        <Space direction="vertical" align="end" size={2}>
          {proceso.estado === 'BORRADOR' && <Tag color="default">Borrador</Tag>}
          {proceso.enRevision && <Tag color="gold">En revisión</Tag>}
          {proceso.estado === 'VIGENTE' && !proceso.enRevision && (
            <Tag color="green">v{proceso.versionVigente}</Tag>
          )}
          {proceso.tieneCambiosEnCurso && !proceso.enRevision && proceso.estado === 'VIGENTE' && (
            <Tag color="blue">cambios</Tag>
          )}
        </Space>
      </Flex>
    </Card>
  )
}
