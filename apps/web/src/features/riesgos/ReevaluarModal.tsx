import { App, Alert, Form, Input, InputNumber, Modal } from 'antd'
import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { mensajeDeError } from '@/lib/api'
import { CategoriaTag } from './categoria'
import { EscalaSelect } from './EscalaSelect'
import { riesgosApi, type CategoriaRiesgo, type RiesgoDetalle } from './riesgosApi'

function categoriaLocal(nivel: number, u: { umbralMedio: number; umbralAlto: number; umbralCritico: number }): CategoriaRiesgo {
  if (nivel >= u.umbralCritico) return 'CRITICO'
  if (nivel >= u.umbralAlto) return 'ALTO'
  if (nivel >= u.umbralMedio) return 'MEDIO'
  return 'BAJO'
}

export function ReevaluarModal({
  detalle,
  onClose,
  onGuardado,
}: {
  detalle: RiesgoDetalle
  onClose: () => void
  onGuardado: () => void
}) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [tick, setTick] = useState(0)
  const r = detalle.riesgo

  const guardar = useMutation({
    mutationFn: (v: Record<string, unknown>) =>
      riesgosApi.reevaluar(r.id, {
        probabilidadResidual: v.probabilidadResidual as number,
        impactoResidual: v.impactoResidual as number,
        comentario: (v.comentario as string) || undefined,
        mesesProximaRevision: (v.mesesProximaRevision as number) || undefined,
      }),
    onSuccess: () => {
      message.success('Riesgo reevaluado')
      onGuardado()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const previa = useMemo(() => {
    void tick
    const { probabilidadResidual: p, impactoResidual: i } = form.getFieldsValue()
    if (!p || !i) return null
    const nivel = p * i
    return { nivel, categoria: categoriaLocal(nivel, detalle.matriz.umbrales) }
  }, [tick, form, detalle.matriz.umbrales])

  return (
    <Modal
      open
      title={`Reevaluar ${r.codigo} (nivel residual)`}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Guardar reevaluación"
      confirmLoading={guardar.isPending}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="Evalúa la probabilidad e impacto que quedan después de aplicar los controles y el plan de tratamiento."
      />
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          probabilidadResidual: r.probabilidadResidual ?? r.probabilidadInherente,
          impactoResidual: r.impactoResidual ?? r.impactoInherente,
          mesesProximaRevision: r.mesesRevisionDefault,
        }}
        onValuesChange={() => setTick((t) => t + 1)}
        onFinish={(v) => guardar.mutate(v)}
      >
        <Form.Item name="probabilidadResidual" label="Probabilidad residual" rules={[{ required: true }]}>
          <EscalaSelect escala={detalle.matriz.escalaProbabilidad} />
        </Form.Item>
        <Form.Item name="impactoResidual" label="Impacto residual" rules={[{ required: true }]}>
          <EscalaSelect escala={detalle.matriz.escalaImpacto} />
        </Form.Item>
        {previa && (
          <div style={{ marginBottom: 12 }}>
            Nivel residual: <strong>{previa.nivel}</strong> <CategoriaTag categoria={previa.categoria} tipo={r.tipo} />
          </div>
        )}
        <Form.Item name="comentario" label="Comentario de la reevaluación">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="mesesProximaRevision" label="Próxima revisión en (meses)">
          <InputNumber min={1} max={60} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
