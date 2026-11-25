import { Alert, App, Form, Input, Modal, Select, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/features/auth/useAuth'
import { procesosApi } from '@/features/procesos/procesosApi'
import { usuariosApi } from '@/features/usuarios/usuariosApi'
import { ETIQUETA_CLASIFICACION, type ClasificacionHallazgo } from '@/features/hallazgos/hallazgosApi'
import { mccApi, type MccDetalle } from './mccApi'

const { Paragraph } = Typography

/**
 * Escala un registro del Control MCC a hallazgo formal (H-AAAA-NNN) para llevarlo por el
 * ciclo ISO completo. Así la no conformidad se gestiona en un solo lugar y cuenta una vez.
 */
export function EscalarHallazgoModal({ registro, abierto, onCerrar }: { registro: MccDetalle['registro']; abierto: boolean; onCerrar: () => void }) {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { puede } = useAuth()
  const [form] = Form.useForm()

  const { data: procesos } = useQuery({ queryKey: ['procesos-lista'], queryFn: () => procesosApi.listar({ pagina: 1 }), enabled: abierto })
  const { data: usuarios } = useQuery({
    queryKey: ['usuarios', 'para-hallazgo'],
    queryFn: () => usuariosApi.listar({ activo: true, porPagina: 100 }),
    enabled: abierto && puede('usuarios.ver'),
  })

  const escalar = useMutation({
    mutationFn: (v: Record<string, string | undefined>) => mccApi.escalar(registro.id, v as never),
    onSuccess: (r) => {
      message.success(`Hallazgo ${r.codigo} creado y vinculado`)
      void qc.invalidateQueries({ queryKey: ['mcc'] })
      void qc.invalidateQueries({ queryKey: ['hallazgos'] })
      onCerrar()
      navigate(`/hallazgos/${r.hallazgoId}`)
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const sugerida: ClasificacionHallazgo = registro.tipoRegistro === 'QUEJA' ? 'OBSERVACION' : 'NO_CONFORMIDAD_MENOR'

  return (
    <Modal
      title={`Escalar ${registro.codigoTipo ?? registro.codigo} a hallazgo formal`}
      open={abierto}
      onCancel={onCerrar}
      onOk={() => form.submit()}
      okText="Crear hallazgo y vincular"
      confirmLoading={escalar.isPending}
      destroyOnClose
      maskClosable={false}
    >
      <Paragraph type="secondary">
        Se creará un hallazgo con su propio código (H-…) para seguir el ciclo ISO completo: validación, análisis de causa,
        plan de acción y verificación de eficacia. Se copian la descripción, el área, la fecha límite, la evidencia y, si
        existen, la causa raíz y los 5 porqués.
      </Paragraph>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Este registro quedará «en seguimiento» y se cerrará solo cuando se verifique la eficacia del hallazgo."
      />
      <Form
        form={form}
        layout="vertical"
        initialValues={{ clasificacion: sugerida, prioridad: registro.prioridad ?? undefined }}
        onFinish={(v) => escalar.mutate(v)}
      >
        <Form.Item name="clasificacion" label="Clasificación" rules={[{ required: true }]}>
          <Select options={(Object.keys(ETIQUETA_CLASIFICACION) as ClasificacionHallazgo[]).map((c) => ({ value: c, label: ETIQUETA_CLASIFICACION[c] }))} />
        </Form.Item>
        <Form.Item name="procesoId" label="Proceso afectado" tooltip="Determina quién puede ver y gestionar el hallazgo">
          <Select allowClear showSearch optionFilterProp="label" placeholder="Opcional"
            options={(procesos?.datos ?? []).map((p) => ({ value: p.id, label: `${p.codigo} · ${p.nombre}` }))} />
        </Form.Item>
        {puede('usuarios.ver') && (
          <Form.Item name="responsableId" label="Responsable de respuesta" tooltip="Necesario para validar el hallazgo">
            <Select allowClear showSearch optionFilterProp="label" placeholder={registro.control.responsableNombre ?? 'Opcional'}
              options={(usuarios?.datos ?? []).map((u) => ({ value: u.id, label: `${u.nombre} (${u.email})` }))} />
          </Form.Item>
        )}
        <Form.Item name="requisito" label="Requisito incumplido">
          <Input placeholder="Ej. ISO 9001:2015 §8.7, protocolo institucional…" maxLength={200} />
        </Form.Item>
        <Form.Item name="prioridad" label="Prioridad">
          <Select allowClear placeholder="Según el impacto del registro"
            options={[{ value: 'ALTA', label: 'Alta' }, { value: 'MEDIA', label: 'Media' }, { value: 'BAJA', label: 'Baja' }]} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
