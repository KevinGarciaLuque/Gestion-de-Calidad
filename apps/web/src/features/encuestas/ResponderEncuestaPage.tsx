import { CheckCircleFilled, SafetyCertificateOutlined } from '@ant-design/icons'
import { Button, Form, Input, Radio, Rate, Result, Skeleton, Typography } from 'antd'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { mensajeDeError } from '@/lib/api'
import { encuestasPublicasApi, type RespuestaEncuestaDto } from './encuestasApi'

const { Title, Text, Paragraph } = Typography
const AZUL = '#00629b'
const AZUL_OSCURO = '#012a44'

interface FormEncuesta {
  calificacionGeneral: number
  atencionPersonal: number
  tiempoEspera: number
  limpieza: number
  recomendaria?: boolean
  comentario?: string
}

export function ResponderEncuestaPage() {
  const { procesoId = '' } = useParams()
  const [form] = Form.useForm<FormEncuesta>()

  const { data: proceso, isLoading, isError } = useQuery({
    queryKey: ['encuesta-publica-proceso', procesoId],
    queryFn: () => encuestasPublicasApi.obtenerProceso(procesoId),
    retry: false,
  })

  const enviar = useMutation({
    mutationFn: (v: FormEncuesta) => encuestasPublicasApi.responder(procesoId, v as RespuestaEncuestaDto),
  })

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: 'radial-gradient(1200px 600px at 50% -10%, #e9f2f9 0%, #f6f9fb 45%, #ffffff 100%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#fff',
          borderRadius: 16,
          padding: '32px 28px',
          boxShadow: '0 10px 40px rgba(1, 42, 68, 0.12)',
          border: '1px solid #eef2f5',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontSize: 20,
              flexShrink: 0,
              background: `linear-gradient(140deg, #1890ff 0%, ${AZUL} 55%, ${AZUL_OSCURO} 100%)`,
            }}
          >
            <SafetyCertificateOutlined />
          </div>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: AZUL_OSCURO }}>Calidad 360</div>
            <div style={{ fontSize: 10.5, letterSpacing: 1.5, color: '#8c8c8c' }}>HOSPITALARIA</div>
          </div>
        </div>

        {isLoading && <Skeleton active paragraph={{ rows: 6 }} />}

        {isError && (
          <Result
            status="404"
            title="Encuesta no disponible"
            subTitle="Este enlace de encuesta ya no está activo. Si crees que es un error, consulta en recepción."
          />
        )}

        {proceso && !enviar.isSuccess && (
          <>
            <Title level={4} style={{ marginBottom: 4 }}>
              Encuesta de satisfacción
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 24 }}>
              Nos interesa tu opinión sobre el servicio recibido en <strong>{proceso.nombre}</strong>. Es anónima
              y toma menos de un minuto.
            </Paragraph>

            <Form<FormEncuesta>
              form={form}
              layout="vertical"
              requiredMark={false}
              onFinish={(v) => enviar.mutate(v)}
            >
              <Form.Item name="calificacionGeneral" label="¿Cómo calificarías tu experiencia en general?" rules={[{ required: true, message: 'Selecciona una calificación' }]}>
                <Rate style={{ fontSize: 30 }} />
              </Form.Item>
              <Form.Item name="atencionPersonal" label="Atención del personal" rules={[{ required: true, message: 'Selecciona una calificación' }]}>
                <Rate style={{ fontSize: 24 }} />
              </Form.Item>
              <Form.Item name="tiempoEspera" label="Tiempo de espera" rules={[{ required: true, message: 'Selecciona una calificación' }]}>
                <Rate style={{ fontSize: 24 }} />
              </Form.Item>
              <Form.Item name="limpieza" label="Limpieza e instalaciones" rules={[{ required: true, message: 'Selecciona una calificación' }]}>
                <Rate style={{ fontSize: 24 }} />
              </Form.Item>
              <Form.Item name="recomendaria" label="¿Recomendarías este servicio?">
                <Radio.Group
                  options={[
                    { label: 'Sí', value: true },
                    { label: 'No', value: false },
                  ]}
                  optionType="button"
                />
              </Form.Item>
              <Form.Item name="comentario" label="Comentarios (opcional)">
                <Input.TextArea rows={3} maxLength={2000} placeholder="Cuéntanos qué podemos mejorar" />
              </Form.Item>

              <Button type="primary" htmlType="submit" block size="large" loading={enviar.isPending} style={{ height: 44, fontWeight: 600, marginTop: 8 }}>
                Enviar encuesta
              </Button>
              {enviar.isError && (
                <Text type="danger" style={{ display: 'block', marginTop: 12 }}>
                  {mensajeDeError(enviar.error, 'No se pudo enviar la encuesta')}
                </Text>
              )}
            </Form>
          </>
        )}

        {enviar.isSuccess && (
          <Result
            icon={<CheckCircleFilled style={{ color: '#389e0d' }} />}
            title="¡Gracias por tu opinión!"
            subTitle="Tu respuesta ayuda a mejorar la calidad del servicio en el hospital."
          />
        )}
      </div>
    </div>
  )
}
