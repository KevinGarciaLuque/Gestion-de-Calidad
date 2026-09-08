import {
  App,
  Button,
  Card,
  Flex,
  Form,
  Input,
  InputNumber,
  Space,
  Typography,
} from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { mensajeDeError } from '@/lib/api'
import { riesgosApi, type NivelEscala } from './riesgosApi'

const { Title, Text, Paragraph } = Typography

interface FormMatriz {
  escalaProbabilidad: NivelEscala[]
  escalaImpacto: NivelEscala[]
  umbralMedio: number
  umbralAlto: number
  umbralCritico: number
  mesesRevisionDefault: number
}

export function MatrizConfigPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [form] = Form.useForm<FormMatriz>()

  const { data, isLoading } = useQuery({ queryKey: ['matriz-riesgo'], queryFn: riesgosApi.matriz })

  const guardar = useMutation({
    mutationFn: (v: FormMatriz) =>
      riesgosApi.configurarMatriz({
        escalaProbabilidad: v.escalaProbabilidad.map((n, i) => ({ ...n, valor: i + 1 })),
        escalaImpacto: v.escalaImpacto.map((n, i) => ({ ...n, valor: i + 1 })),
        umbralMedio: v.umbralMedio,
        umbralAlto: v.umbralAlto,
        umbralCritico: v.umbralCritico,
        mesesRevisionDefault: v.mesesRevisionDefault,
      }),
    onSuccess: () => {
      message.success('Matriz actualizada. Se recalcularon las categorías de los riesgos.')
      void qc.invalidateQueries()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  if (isLoading || !data) return null

  return (
    <>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Matriz de evaluación de riesgos
          </Title>
          <Text type="secondary">Escalas y umbrales para clasificar el nivel de riesgo</Text>
        </div>
        <Button onClick={() => navigate('/riesgos')}>Volver</Button>
      </Flex>

      <Paragraph type="secondary">
        El nivel de un riesgo es <b>probabilidad × impacto</b>. Al cambiar los umbrales se
        reclasifican automáticamente todos los riesgos registrados.
      </Paragraph>

      <Form<FormMatriz>
        form={form}
        layout="vertical"
        initialValues={data}
        onFinish={(v) => guardar.mutate(v)}
      >
        <Flex gap={16} wrap align="flex-start">
          <EscalaCampo nombre="escalaProbabilidad" titulo="Escala de probabilidad" />
          <EscalaCampo nombre="escalaImpacto" titulo="Escala de impacto" />
        </Flex>

        <Card size="small" title="Umbrales de categoría (nivel = prob × impacto)" style={{ marginTop: 16, maxWidth: 520 }}>
          <Flex gap={16} wrap>
            <Form.Item name="umbralMedio" label="Medio a partir de" rules={[{ required: true }]}>
              <InputNumber min={2} />
            </Form.Item>
            <Form.Item name="umbralAlto" label="Alto a partir de" rules={[{ required: true }]}>
              <InputNumber min={3} />
            </Form.Item>
            <Form.Item name="umbralCritico" label="Crítico a partir de" rules={[{ required: true }]}>
              <InputNumber min={4} />
            </Form.Item>
            <Form.Item name="mesesRevisionDefault" label="Revisión cada (meses)" rules={[{ required: true }]}>
              <InputNumber min={1} max={60} />
            </Form.Item>
          </Flex>
        </Card>

        <Button type="primary" htmlType="submit" style={{ marginTop: 16 }} loading={guardar.isPending}>
          Guardar matriz
        </Button>
      </Form>
    </>
  )
}

function EscalaCampo({ nombre, titulo }: { nombre: 'escalaProbabilidad' | 'escalaImpacto'; titulo: string }) {
  return (
    <Card size="small" title={titulo} style={{ flex: '1 1 380px' }}>
      <Form.List name={nombre}>
        {(campos, { add, remove }) => (
          <>
            {campos.map(({ key, name }, idx) => (
              <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 6 }}>
                <Text type="secondary" style={{ width: 18 }}>
                  {idx + 1}
                </Text>
                <Form.Item name={[name, 'etiqueta']} rules={[{ required: true, message: 'Etiqueta' }]} style={{ marginBottom: 0 }}>
                  <Input placeholder="Etiqueta" style={{ width: 130 }} />
                </Form.Item>
                <Form.Item name={[name, 'descripcion']} style={{ marginBottom: 0 }}>
                  <Input placeholder="Descripción" style={{ width: 200 }} />
                </Form.Item>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={campos.length <= 3}
                  onClick={() => remove(name)}
                />
              </Space>
            ))}
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => add({ etiqueta: '', descripcion: '' })}
              disabled={campos.length >= 7}
              block
            >
              Agregar nivel
            </Button>
          </>
        )}
      </Form.List>
    </Card>
  )
}
