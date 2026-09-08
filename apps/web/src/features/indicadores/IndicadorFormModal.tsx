import { App, Divider, Form, Input, InputNumber, Modal, Select, Switch } from 'antd'
import { useMutation, useQuery } from '@tanstack/react-query'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/features/auth/useAuth'
import { procesosApi } from '@/features/procesos/procesosApi'
import { usuariosApi } from '@/features/usuarios/usuariosApi'
import {
  ETIQUETA_FRECUENCIA,
  indicadoresApi,
  type DefinicionIndicador,
  type Frecuencia,
} from './indicadoresApi'

interface Props {
  indicador?: DefinicionIndicador
  procesoIdFijo?: string
  onClose: () => void
  onGuardado: (id: string) => void
}

export function IndicadorFormModal({ indicador, procesoIdFijo, onClose, onGuardado }: Props) {
  const { message } = App.useApp()
  const { puede } = useAuth()
  const [form] = Form.useForm()
  const edicion = !!indicador

  const { data: procesos } = useQuery({
    queryKey: ['procesos-lista'],
    queryFn: () => procesosApi.listar({ pagina: 1 }),
    enabled: !procesoIdFijo && !edicion,
  })
  const { data: usuarios } = useQuery({
    queryKey: ['usuarios', 'para-indicador'],
    queryFn: () => usuariosApi.listar({ activo: true, porPagina: 100 }),
    enabled: puede('usuarios.ver'),
  })

  const guardar = useMutation({
    mutationFn: (v: Record<string, unknown>) => {
      const payload = {
        nombre: v.nombre as string,
        objetivo: v.objetivo as string,
        formula: v.formula as string,
        usaNumeradorDenominador: v.usaNumeradorDenominador as boolean,
        expresarPorcentaje: (v.expresarPorcentaje as boolean) ?? false,
        unidad: v.unidad as string,
        fuenteDatos: (v.fuenteDatos as string) || undefined,
        frecuencia: v.frecuencia as Frecuencia,
        sentido: v.sentido as 'CRECIENTE' | 'DECRECIENTE',
        meta: v.meta as number,
        umbralAmarillo: v.umbralAmarillo === undefined ? null : (v.umbralAmarillo as number),
        responsableCapturaId: (v.responsableCapturaId as string) ?? null,
        responsableAnalisisId: (v.responsableAnalisisId as string) ?? null,
      }
      return edicion
        ? indicadoresApi.editar(indicador!.id, payload)
        : indicadoresApi.crear({
            ...payload,
            codigo: v.codigo as string,
            procesoId: (procesoIdFijo ?? v.procesoId) as string,
          })
    },
    onSuccess: (det) => {
      message.success(edicion ? 'Indicador actualizado' : 'Indicador creado')
      onGuardado(det.indicador.id)
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const opcionesUsuario =
    usuarios?.datos.map((u) => ({ value: u.id, label: `${u.nombre} (${u.email})` })) ?? []

  return (
    <Modal
      open
      width={640}
      title={edicion ? `Editar ${indicador!.codigo}` : 'Nuevo indicador'}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Guardar"
      confirmLoading={guardar.isPending}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={
          indicador
            ? { ...indicador, responsableCapturaId: indicador.responsableCaptura?.id, responsableAnalisisId: indicador.responsableAnalisis?.id }
            : { usaNumeradorDenominador: true, expresarPorcentaje: true, sentido: 'CRECIENTE', unidad: '%' }
        }
        onFinish={(v) => guardar.mutate(v)}
      >
        {!edicion && (
          <Form.Item
            name="codigo"
            label="Código"
            rules={[
              { required: true, message: 'Ingresa un código' },
              { pattern: /^[A-Za-z0-9][A-Za-z0-9-]{1,29}$/, message: 'Código no válido' },
            ]}
          >
            <Input placeholder="IND-CAL-001" />
          </Form.Item>
        )}
        {!edicion && !procesoIdFijo && (
          <Form.Item name="procesoId" label="Proceso" rules={[{ required: true, message: 'Elige el proceso' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={(procesos?.datos ?? []).map((p) => ({ value: p.id, label: `${p.codigo} · ${p.nombre}` }))}
            />
          </Form.Item>
        )}
        <Form.Item name="nombre" label="Nombre" rules={[{ required: true, min: 3 }]}>
          <Input />
        </Form.Item>
        <Form.Item name="objetivo" label="Qué mide (objetivo)" rules={[{ required: true, min: 3 }]}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="formula" label="Fórmula" rules={[{ required: true, min: 2 }]}>
          <Input placeholder="Ej. n.º de eventos / total de egresos x 1000" />
        </Form.Item>

        <Divider style={{ margin: '8px 0' }} />

        <Form.Item name="usaNumeradorDenominador" label="Se calcula con numerador y denominador" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(a, b) => a.usaNumeradorDenominador !== b.usaNumeradorDenominador}
        >
          {({ getFieldValue }) =>
            getFieldValue('usaNumeradorDenominador') && (
              <Form.Item name="expresarPorcentaje" label="Expresar como porcentaje (× 100)" valuePropName="checked">
                <Switch />
              </Form.Item>
            )
          }
        </Form.Item>

        <Form.Item name="unidad" label="Unidad de medida" rules={[{ required: true }]}>
          <Input placeholder="%, días, casos, ‰…" />
        </Form.Item>
        <Form.Item name="fuenteDatos" label="Fuente de datos">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="frecuencia" label="Frecuencia" rules={[{ required: true }]}>
          <Select
            options={(Object.keys(ETIQUETA_FRECUENCIA) as Frecuencia[]).map((f) => ({
              value: f,
              label: ETIQUETA_FRECUENCIA[f],
            }))}
          />
        </Form.Item>
        <Form.Item name="sentido" label="Sentido de mejora" rules={[{ required: true }]}>
          <Select
            options={[
              { value: 'CRECIENTE', label: 'Un valor más alto es mejor' },
              { value: 'DECRECIENTE', label: 'Un valor más bajo es mejor' },
            ]}
          />
        </Form.Item>
        <Form.Item name="meta" label="Meta" rules={[{ required: true, message: 'Ingresa la meta' }]}>
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="umbralAmarillo"
          label="Umbral amarillo (opcional)"
          tooltip="Valor a partir del cual el resultado pasa de rojo a amarillo. Debe quedar peor que la meta."
        >
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>

        <Divider style={{ margin: '8px 0' }} />

        {puede('usuarios.ver') && (
          <>
            <Form.Item name="responsableCapturaId" label="Responsable de captura">
              <Select allowClear showSearch optionFilterProp="label" options={opcionesUsuario} />
            </Form.Item>
            <Form.Item name="responsableAnalisisId" label="Responsable de análisis">
              <Select allowClear showSearch optionFilterProp="label" options={opcionesUsuario} />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  )
}
