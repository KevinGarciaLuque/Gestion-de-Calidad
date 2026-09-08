import { App, Alert, Form, Input, InputNumber, Modal, Select } from 'antd'
import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { mensajeDeError } from '@/lib/api'
import { calcularVistaPrevia } from './calculoCliente'
import { indicadoresApi, type IndicadorDetalle } from './indicadoresApi'

export function RegistrarMedicionModal({
  detalle,
  onClose,
  onGuardado,
}: {
  detalle: IndicadorDetalle
  onClose: () => void
  onGuardado: () => void
}) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const ind = detalle.indicador
  const [tick, setTick] = useState(0)

  const guardar = useMutation({
    mutationFn: (v: Record<string, unknown>) => {
      const [anio, periodo] = String(v.periodoClave).split('-').map(Number)
      return indicadoresApi.registrarMedicion(ind.id, {
        anio,
        periodo,
        numerador: ind.usaNumeradorDenominador ? (v.numerador as number) : undefined,
        denominador: ind.usaNumeradorDenominador ? (v.denominador as number) : undefined,
        valor: ind.usaNumeradorDenominador ? undefined : (v.valor as number),
        analisis: (v.analisis as string) || undefined,
        planAccion: (v.planAccion as string) || undefined,
        evidenciaUrl: (v.evidenciaUrl as string) || undefined,
      })
    },
    onSuccess: () => {
      message.success('Medición registrada')
      onGuardado()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const previa = useMemo(() => {
    void tick
    const v = form.getFieldsValue()
    return calcularVistaPrevia(ind, {
      numerador: v.numerador,
      denominador: v.denominador,
      valor: v.valor,
    })
  }, [tick, form, ind])

  const periodosOcupados = new Set(detalle.mediciones.map((m) => `${m.anio}-${m.periodo}`))

  return (
    <Modal
      open
      title={`Registrar medición · ${ind.codigo}`}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Guardar"
      confirmLoading={guardar.isPending}
    >
      <Form form={form} layout="vertical" onValuesChange={() => setTick((t) => t + 1)} onFinish={(v) => guardar.mutate(v)}>
        <Form.Item name="periodoClave" label="Periodo" rules={[{ required: true, message: 'Elige el periodo' }]}>
          <Select
            options={detalle.periodosDisponibles.map((p) => ({
              value: `${p.anio}-${p.periodo}`,
              label: `${p.etiqueta}${periodosOcupados.has(`${p.anio}-${p.periodo}`) ? ' — ya registrado (se sobreescribe)' : ''}`,
            }))}
          />
        </Form.Item>

        {ind.usaNumeradorDenominador ? (
          <>
            <Form.Item name="numerador" label="Numerador" rules={[{ required: true, message: 'Requerido' }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="denominador"
              label="Denominador"
              rules={[
                { required: true, message: 'Requerido' },
                { validator: (_, v) => (v === 0 ? Promise.reject(new Error('No puede ser cero')) : Promise.resolve()) },
              ]}
            >
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </>
        ) : (
          <Form.Item name="valor" label={`Valor (${ind.unidad})`} rules={[{ required: true, message: 'Requerido' }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        )}

        {previa && (
          <Alert
            style={{ marginBottom: 12 }}
            type={previa.semaforo === 'VERDE' ? 'success' : previa.semaforo === 'AMARILLO' ? 'warning' : 'error'}
            message={`Resultado: ${previa.valor}${ind.unidad === '%' ? '%' : ` ${ind.unidad}`} — ${
              previa.semaforo === 'VERDE' ? 'en meta' : previa.semaforo === 'AMARILLO' ? 'cerca de la meta' : 'fuera de meta'
            }`}
          />
        )}

        <Form.Item name="analisis" label={previa?.semaforo && previa.semaforo !== 'VERDE' ? 'Análisis (recomendado si está fuera de meta)' : 'Análisis (opcional)'}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="planAccion" label="Plan de acción (opcional)">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="evidenciaUrl" label="Enlace a evidencia (opcional)">
          <Input placeholder="https://…" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
