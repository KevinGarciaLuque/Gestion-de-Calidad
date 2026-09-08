import { App, DatePicker, Form, Input, Modal, Select } from 'antd'
import { useMutation, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/features/auth/useAuth'
import { procesosApi } from '@/features/procesos/procesosApi'
import { usuariosApi } from '@/features/usuarios/usuariosApi'
import {
  accionesApi,
  ETIQUETA_ORIGEN_ACCION,
  ETIQUETA_TIPO_ACCION,
  type AccionDetalle,
  type OrigenAccion,
  type TipoAccion,
} from './accionesApi'

export interface OrigenFijo {
  origen: OrigenAccion
  hallazgoId?: string
  riesgoId?: string
  medicionId?: string
  mccId?: string
  tipoSugerido?: TipoAccion
}

export function AccionFormModal({
  accion,
  origenFijo,
  onClose,
  onGuardado,
}: {
  accion?: AccionDetalle['accion']
  origenFijo?: OrigenFijo
  onClose: () => void
  onGuardado: (id: string) => void
}) {
  const { message } = App.useApp()
  const { puede } = useAuth()
  const [form] = Form.useForm()
  const edicion = !!accion

  const { data: usuarios } = useQuery({
    queryKey: ['usuarios', 'para-accion'],
    queryFn: () => usuariosApi.listar({ activo: true, porPagina: 100 }),
    enabled: puede('usuarios.ver'),
  })
  const { data: procesos } = useQuery({
    queryKey: ['procesos-lista'],
    queryFn: () => procesosApi.listar({ pagina: 1 }),
    enabled: !edicion && !origenFijo,
  })

  const guardar = useMutation({
    mutationFn: (v: Record<string, unknown>) => {
      const base = {
        tipo: v.tipo as TipoAccion,
        descripcion: v.descripcion as string,
        resultadoEsperado: (v.resultadoEsperado as string) || undefined,
        responsableId: (v.responsableId as string) || undefined,
        fechaInicio: v.fechaInicio ? (v.fechaInicio as dayjs.Dayjs).toISOString() : undefined,
        fechaCompromiso: v.fechaCompromiso ? (v.fechaCompromiso as dayjs.Dayjs).toISOString() : undefined,
        prioridad: (v.prioridad as 'BAJA' | 'MEDIA' | 'ALTA') || undefined,
        evidenciaRequerida: (v.evidenciaRequerida as string) || undefined,
        colaboradoresIds: (v.colaboradoresIds as string[]) || [],
      }
      if (edicion) return accionesApi.editar(accion!.id, base)
      return accionesApi.crear({
        ...base,
        origen: (origenFijo?.origen ?? (v.origen as OrigenAccion)) as OrigenAccion,
        origenLibre: (v.origenLibre as string) || undefined,
        hallazgoId: origenFijo?.hallazgoId,
        riesgoId: origenFijo?.riesgoId,
        medicionId: origenFijo?.medicionId,
        mccId: origenFijo?.mccId,
        procesoId: (v.procesoId as string) || undefined,
      })
    },
    onSuccess: (det) => {
      message.success(edicion ? 'Acción actualizada' : 'Acción creada')
      onGuardado(det.accion.id)
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const opcionesUsuario = usuarios?.datos.map((u) => ({ value: u.id, label: `${u.nombre} (${u.email})` })) ?? []

  return (
    <Modal
      open
      width={620}
      title={edicion ? `Editar ${accion!.codigo}` : 'Nueva acción'}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Guardar"
      confirmLoading={guardar.isPending}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={
          accion
            ? {
                tipo: accion.tipo,
                descripcion: accion.descripcion,
                resultadoEsperado: accion.resultadoEsperado ?? '',
                responsableId: accion.responsable?.id,
                colaboradoresIds: accion.colaboradores.map((c) => c.id),
                fechaInicio: accion.fechaInicio ? dayjs(accion.fechaInicio) : undefined,
                fechaCompromiso: accion.fechaCompromiso ? dayjs(accion.fechaCompromiso) : undefined,
                prioridad: accion.prioridad,
                evidenciaRequerida: accion.evidenciaRequerida ?? '',
              }
            : {
                tipo:
                  origenFijo?.tipoSugerido ??
                  (origenFijo?.origen === 'RIESGO'
                    ? 'TRATAMIENTO_RIESGO'
                    : origenFijo?.origen === 'MCC'
                      ? 'MEJORA'
                      : 'ACCION_CORRECTIVA'),
                prioridad: 'MEDIA',
                origen: 'OTRO',
              }
        }
        onFinish={(v) => guardar.mutate(v)}
      >
        {!edicion && !origenFijo && (
          <>
            <Form.Item name="origen" label="Origen" rules={[{ required: true }]}>
              <Select
                options={(Object.keys(ETIQUETA_ORIGEN_ACCION) as OrigenAccion[]).map((o) => ({
                  value: o,
                  label: ETIQUETA_ORIGEN_ACCION[o],
                }))}
              />
            </Form.Item>
            <Form.Item name="origenLibre" label="Detalle del origen">
              <Input placeholder="Ej. Acta de comité de calidad del 12/06" />
            </Form.Item>
            <Form.Item name="procesoId" label="Proceso (opcional)">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                options={(procesos?.datos ?? []).map((p) => ({ value: p.id, label: `${p.codigo} · ${p.nombre}` }))}
              />
            </Form.Item>
          </>
        )}

        <Form.Item name="tipo" label="Tipo de acción" rules={[{ required: true }]}>
          <Select
            options={(Object.keys(ETIQUETA_TIPO_ACCION) as TipoAccion[]).map((t) => ({
              value: t,
              label: ETIQUETA_TIPO_ACCION[t],
            }))}
          />
        </Form.Item>
        <Form.Item name="descripcion" label="Descripción" rules={[{ required: true, min: 5 }]}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="resultadoEsperado" label="Resultado esperado">
          <Input.TextArea rows={2} />
        </Form.Item>
        {puede('usuarios.ver') && (
          <>
            <Form.Item name="responsableId" label="Responsable">
              <Select allowClear showSearch optionFilterProp="label" options={opcionesUsuario} />
            </Form.Item>
            <Form.Item name="colaboradoresIds" label="Colaboradores">
              <Select mode="multiple" allowClear showSearch optionFilterProp="label" options={opcionesUsuario} />
            </Form.Item>
          </>
        )}
        <Form.Item name="fechaInicio" label="Fecha de inicio">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="fechaCompromiso" label="Fecha compromiso">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="prioridad" label="Prioridad">
          <Select options={[{ value: 'BAJA', label: 'Baja' }, { value: 'MEDIA', label: 'Media' }, { value: 'ALTA', label: 'Alta' }]} />
        </Form.Item>
        <Form.Item name="evidenciaRequerida" label="Evidencia requerida">
          <Input.TextArea rows={2} placeholder="Qué evidencia debe cargarse para dar por completada la acción" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
