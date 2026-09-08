import { useState } from 'react'
import { App, Button, Flex, Input, Segmented, Space, Tag, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined, WarningOutlined } from '@ant-design/icons'
import { useMutation } from '@tanstack/react-query'
import { mensajeDeError } from '@/lib/api'
import { GenerarHallazgoModal } from './GenerarHallazgoModal'
import {
  auditoriasApi,
  ETIQUETA_RESULTADO,
  type AuditoriaDetalle,
  type ItemChecklist,
  type ResultadoItem,
} from './auditoriasApi'

const { Text } = Typography

const OPCIONES: { value: ResultadoItem; label: string }[] = [
  { value: 'CUMPLE', label: 'Cumple' },
  { value: 'NO_CUMPLE', label: 'No cumple' },
  { value: 'OBSERVACION', label: 'Observación' },
  { value: 'NO_APLICA', label: 'N/A' },
]

export function ChecklistTab({
  detalle,
  onCambio,
}: {
  detalle: AuditoriaDetalle
  onCambio: () => void
}) {
  const { message, modal } = App.useApp()
  const a = detalle.auditoria
  const [nuevo, setNuevo] = useState('')
  const [hallazgoDe, setHallazgoDe] = useState<ItemChecklist | null>(null)
  const puedeEditar = detalle.puede.ejecutar
  const enCurso = a.estado === 'EN_CURSO'
  const planificada = a.estado === 'PLANIFICADA'

  const run = (p: Promise<unknown>) => p.then(onCambio).catch((e) => message.error(mensajeDeError(e)))

  const agregar = useMutation({
    mutationFn: () => auditoriasApi.agregarItem(a.id, nuevo.trim()),
    onSuccess: () => {
      setNuevo('')
      onCambio()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <Space wrap>
          {detalle.resumen.total > 0 && (
            <>
              <Tag color="green">{detalle.resumen.CUMPLE} cumple</Tag>
              <Tag color="red">{detalle.resumen.NO_CUMPLE} no cumple</Tag>
              <Tag color="gold">{detalle.resumen.OBSERVACION} observación</Tag>
              <Tag>{detalle.resumen.NO_APLICA} N/A</Tag>
              {detalle.resumen.PENDIENTE > 0 && <Tag color="processing">{detalle.resumen.PENDIENTE} pendiente</Tag>}
              {detalle.resumen.cumplimiento != null && <Text strong>{detalle.resumen.cumplimiento}% conformidad</Text>}
            </>
          )}
        </Space>
        {puedeEditar && (
          <Space>
            {planificada && (
              <Button
                type="primary"
                onClick={() =>
                  modal.confirm({ title: 'Iniciar la ejecución de la auditoría', onOk: () => run(auditoriasApi.iniciar(a.id)) })
                }
              >
                Iniciar auditoría
              </Button>
            )}
            {enCurso && (
              <Button
                type="primary"
                onClick={() =>
                  modal.confirm({
                    title: 'Finalizar la ejecución',
                    content: 'Se generará el informe automático. Todos los ítems deben estar evaluados.',
                    onOk: () => run(auditoriasApi.finalizar(a.id)),
                  })
                }
              >
                Finalizar ejecución
              </Button>
            )}
          </Space>
        )}
      </Flex>

      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        {detalle.checklist.map((it) => (
          <ItemFila
            key={it.id}
            item={it}
            auditoriaId={a.id}
            editable={puedeEditar && (enCurso || planificada)}
            evaluable={puedeEditar && enCurso}
            puedeHallazgo={detalle.puede.crearHallazgo && enCurso}
            onCambio={onCambio}
            onGenerarHallazgo={() => setHallazgoDe(it)}
          />
        ))}
        {detalle.checklist.length === 0 && <Text type="secondary">El checklist está vacío.</Text>}
      </Space>

      {puedeEditar && (enCurso || planificada) && (
        <Flex gap={8} style={{ marginTop: 16 }}>
          <Input
            placeholder="Nuevo criterio / pregunta de verificación"
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            onPressEnter={() => nuevo.trim() && agregar.mutate()}
          />
          <Button icon={<PlusOutlined />} onClick={() => nuevo.trim() && agregar.mutate()} loading={agregar.isPending}>
            Agregar
          </Button>
        </Flex>
      )}

      {hallazgoDe && (
        <GenerarHallazgoModal
          auditoriaId={a.id}
          item={hallazgoDe}
          onClose={() => setHallazgoDe(null)}
          onGuardado={() => {
            setHallazgoDe(null)
            onCambio()
          }}
        />
      )}
    </>
  )
}

function ItemFila({
  item,
  auditoriaId,
  editable,
  evaluable,
  puedeHallazgo,
  onCambio,
  onGenerarHallazgo,
}: {
  item: ItemChecklist
  auditoriaId: string
  editable: boolean
  evaluable: boolean
  puedeHallazgo: boolean
  onCambio: () => void
  onGenerarHallazgo: () => void
}) {
  const { message } = App.useApp()
  const [notas, setNotas] = useState(item.notas ?? '')

  const guardar = useMutation({
    mutationFn: (r: ResultadoItem) => auditoriasApi.resultado(auditoriaId, item.id, r, notas || undefined),
    onSuccess: onCambio,
    onError: (e) => message.error(mensajeDeError(e)),
  })
  const guardarNotas = useMutation({
    mutationFn: () => auditoriasApi.resultado(auditoriaId, item.id, item.resultado, notas || undefined),
    onSuccess: onCambio,
    onError: (e) => message.error(mensajeDeError(e)),
  })
  const quitar = useMutation({
    mutationFn: () => auditoriasApi.quitarItem(auditoriaId, item.id),
    onSuccess: onCambio,
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const requiereHallazgo = ['NO_CUMPLE', 'OBSERVACION'].includes(item.resultado) && item.hallazgos.length === 0

  return (
    <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
      <Flex justify="space-between" align="flex-start" gap={12} wrap>
        <div style={{ flex: 1, minWidth: 240 }}>
          <Text strong>
            {item.orden}. {item.criterio}
          </Text>
          {evaluable ? (
            <div style={{ marginTop: 8 }}>
              <Segmented
                size="small"
                value={item.resultado === 'PENDIENTE' ? undefined : item.resultado}
                options={OPCIONES}
                onChange={(v) => guardar.mutate(v as ResultadoItem)}
              />
            </div>
          ) : (
            <div style={{ marginTop: 4 }}>
              <Tag
                color={
                  item.resultado === 'CUMPLE'
                    ? 'green'
                    : item.resultado === 'NO_CUMPLE'
                      ? 'red'
                      : item.resultado === 'OBSERVACION'
                        ? 'gold'
                        : 'default'
                }
              >
                {ETIQUETA_RESULTADO[item.resultado]}
              </Tag>
            </div>
          )}
        </div>
        {editable && !evaluable && item.hallazgos.length === 0 && (
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => quitar.mutate()} />
        )}
      </Flex>

      {evaluable && (
        <Input.TextArea
          style={{ marginTop: 8 }}
          rows={2}
          placeholder="Notas / evidencia observada"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          onBlur={() => notas !== (item.notas ?? '') && guardarNotas.mutate()}
        />
      )}
      {!evaluable && item.notas && (
        <Text type="secondary" style={{ display: 'block', marginTop: 4, whiteSpace: 'pre-wrap' }}>
          {item.notas}
        </Text>
      )}

      <Space style={{ marginTop: 8 }} wrap>
        {item.hallazgos.map((h) => (
          <Tag key={h.id} color="volcano">
            {h.codigo}
          </Tag>
        ))}
        {puedeHallazgo && requiereHallazgo && (
          <Button size="small" icon={<WarningOutlined />} onClick={onGenerarHallazgo}>
            Generar hallazgo
          </Button>
        )}
      </Space>
    </div>
  )
}
