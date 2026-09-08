import { App, Button, DatePicker, Divider, Form, List, Modal, Select, Space, Tag } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { Dayjs } from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { rolesApi } from '@/features/roles/rolesApi'
import { aplanar, organizacionApi } from '@/features/organizacion/organizacionApi'
import type { TipoAlcance } from '@/lib/tipos'
import { usuariosApi, type UsuarioFila } from './usuariosApi'

interface FormRol {
  rolCodigo: string
  tipoAlcance: TipoAlcance
  unidadId?: string
  expiraAt?: Dayjs
}

export function GestionRolesModal({
  usuario,
  onClose,
  onCambio,
}: {
  usuario: UsuarioFila
  onClose: () => void
  onCambio: () => void
}) {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [form] = Form.useForm<FormRol>()
  const [alcance, setAlcance] = useState<TipoAlcance>('GLOBAL')

  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.listar })
  const { data: arbol } = useQuery({ queryKey: ['organizacion'], queryFn: organizacionApi.arbol })

  // Se relee el usuario para reflejar cambios sin cerrar el modal.
  const { data: usuarioActual } = useQuery({
    queryKey: ['usuario', usuario.id],
    queryFn: () => usuariosApi.listar({ q: usuario.email, porPagina: 1 }).then((r) => r.datos[0]),
    initialData: usuario,
  })

  const refrescar = () => {
    void qc.invalidateQueries({ queryKey: ['usuario', usuario.id] })
    onCambio()
  }

  const asignar = useMutation({
    mutationFn: (v: FormRol) =>
      usuariosApi.asignarRol(usuario.id, {
        rolCodigo: v.rolCodigo,
        tipoAlcance: v.tipoAlcance,
        unidadId: v.tipoAlcance === 'UNIDAD' ? v.unidadId : undefined,
        expiraAt: v.expiraAt?.toISOString(),
      }),
    onSuccess: () => {
      message.success('Rol asignado')
      form.resetFields()
      setAlcance('GLOBAL')
      refrescar()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const quitar = useMutation({
    mutationFn: (usuarioRolId: string) => usuariosApi.quitarRol(usuario.id, usuarioRolId),
    onSuccess: () => {
      message.success('Rol quitado')
      refrescar()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const opcionesUnidad = arbol ? aplanar(arbol) : []

  return (
    <Modal open title={`Roles de ${usuario.nombre}`} onCancel={onClose} footer={null} width={560}>
      <List
        size="small"
        locale={{ emptyText: 'Sin roles asignados' }}
        dataSource={usuarioActual?.roles ?? []}
        renderItem={(r) => (
          <List.Item
            actions={[
              <Button
                key="del"
                type="text"
                danger
                icon={<DeleteOutlined />}
                loading={quitar.isPending}
                onClick={() => quitar.mutate(r.id)}
              />,
            ]}
          >
            <Space wrap>
              <Tag color="blue">{r.rol.nombre}</Tag>
              <span>
                {r.tipoAlcance === 'GLOBAL'
                  ? 'Alcance global'
                  : r.tipoAlcance === 'UNIDAD'
                    ? `Unidad: ${r.unidad?.nombre ?? '—'}`
                    : 'Proceso'}
              </span>
              {r.expiraAt && <Tag color="gold">expira {r.expiraAt.slice(0, 10)}</Tag>}
            </Space>
          </List.Item>
        )}
      />

      <Divider>Asignar rol</Divider>

      <Form<FormRol>
        form={form}
        layout="vertical"
        initialValues={{ tipoAlcance: 'GLOBAL' }}
        onFinish={(v) => asignar.mutate(v)}
      >
        <Form.Item name="rolCodigo" label="Rol" rules={[{ required: true, message: 'Elige un rol' }]}>
          <Select
            placeholder="Selecciona un rol"
            options={(roles ?? [])
              .filter((r) => r.activo)
              .map((r) => ({ value: r.codigo, label: r.nombre }))}
          />
        </Form.Item>

        <Form.Item name="tipoAlcance" label="Alcance">
          <Select
            onChange={(v: TipoAlcance) => setAlcance(v)}
            options={[
              { value: 'GLOBAL', label: 'Global (toda la organización)' },
              { value: 'UNIDAD', label: 'Una unidad organizativa' },
              { value: 'PROCESO', label: 'Un proceso (disponible en la Fase 2)', disabled: true },
            ]}
          />
        </Form.Item>

        {alcance === 'UNIDAD' && (
          <Form.Item
            name="unidadId"
            label="Unidad"
            rules={[{ required: true, message: 'Elige la unidad' }]}
          >
            <Select showSearch optionFilterProp="label" options={opcionesUnidad} />
          </Form.Item>
        )}

        <Form.Item name="expiraAt" label="Expira (opcional)" tooltip="Para accesos temporales">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={asignar.isPending} block>
          Asignar
        </Button>
      </Form>
    </Modal>
  )
}
