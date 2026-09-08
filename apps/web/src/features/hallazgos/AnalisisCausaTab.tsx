import { useMemo, useState } from 'react'
import { App, Button, Card, Checkbox, Input, Segmented, Space, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation } from '@tanstack/react-query'
import { mensajeDeError } from '@/lib/api'
import {
  ETIQUETA_METODOLOGIA,
  hallazgosApi,
  type HallazgoDetalle,
  type MetodologiaCausa,
} from './hallazgosApi'

const { Text, Paragraph } = Typography

const CATEGORIAS_ISHIKAWA = ['Personas', 'Métodos', 'Materiales', 'Máquinas / Equipos', 'Medio ambiente', 'Medición']

interface Porque {
  pregunta: string
  respuesta: string
}
interface CategoriaIsh {
  nombre: string
  causas: string[]
}
interface CausaLluvia {
  causa: string
  validada: boolean
  comentario?: string
}

export function AnalisisCausaTab({
  detalle,
  onCambio,
}: {
  detalle: HallazgoDetalle
  onCambio: () => void
}) {
  const { message } = App.useApp()
  const a = detalle.analisis
  const puedeEditar = detalle.puede.editar && detalle.hallazgo.estado !== 'CERRADO'

  const [metodologia, setMetodologia] = useState<MetodologiaCausa>(a?.metodologia ?? 'CINCO_PORQUES')
  const [porques, setPorques] = useState<Porque[]>(
    (a?.contenido?.porques as Porque[] | undefined) ?? [{ pregunta: '¿Por qué ocurrió?', respuesta: '' }],
  )
  const [problema, setProblema] = useState((a?.contenido?.problema as string) ?? detalle.hallazgo.descripcion)
  const [efecto, setEfecto] = useState((a?.contenido?.efecto as string) ?? detalle.hallazgo.descripcion)
  const [categorias, setCategorias] = useState<CategoriaIsh[]>(
    (a?.contenido?.categorias as CategoriaIsh[] | undefined) ??
      CATEGORIAS_ISHIKAWA.map((nombre) => ({ nombre, causas: [] })),
  )
  const [lluvia, setLluvia] = useState<CausaLluvia[]>((a?.contenido?.causas as CausaLluvia[] | undefined) ?? [])
  const [textoOtro, setTextoOtro] = useState((a?.contenido?.texto as string) ?? '')
  const [causaInmediata, setCausaInmediata] = useState(a?.causaInmediata ?? '')
  const [causaContribuyente, setCausaContribuyente] = useState(a?.causaContribuyente ?? '')
  const [causaRaiz, setCausaRaiz] = useState(a?.causaRaiz ?? '')
  const [comentarios, setComentarios] = useState(a?.comentariosEquipo ?? '')

  const contenido = useMemo(() => {
    if (metodologia === 'CINCO_PORQUES') return { problema, porques }
    if (metodologia === 'ISHIKAWA') return { efecto, categorias }
    if (metodologia === 'LLUVIA_CAUSAS') return { causas: lluvia }
    return { texto: textoOtro }
  }, [metodologia, problema, porques, efecto, categorias, lluvia, textoOtro])

  const guardar = useMutation({
    mutationFn: () =>
      hallazgosApi.guardarAnalisis(detalle.hallazgo.id, {
        metodologia,
        contenido: contenido as Record<string, unknown>,
        causaInmediata: causaInmediata || undefined,
        causaContribuyente: causaContribuyente || undefined,
        causaRaiz: causaRaiz || undefined,
        comentariosEquipo: comentarios || undefined,
      }),
    onSuccess: () => {
      message.success('Análisis de causa guardado')
      onCambio()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  if (!puedeEditar && !a) return <Text type="secondary">Aún no se ha registrado el análisis de causa.</Text>

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Text strong>Metodología</Text>
        <div style={{ marginTop: 6 }}>
          {puedeEditar ? (
            <Segmented
              value={metodologia}
              onChange={(v) => setMetodologia(v as MetodologiaCausa)}
              options={(Object.keys(ETIQUETA_METODOLOGIA) as MetodologiaCausa[]).map((m) => ({
                value: m,
                label: ETIQUETA_METODOLOGIA[m],
              }))}
            />
          ) : (
            <Text>{ETIQUETA_METODOLOGIA[metodologia]}</Text>
          )}
        </div>
      </div>

      {metodologia === 'CINCO_PORQUES' && (
        <Card size="small" title="5 porqués">
          <Input
            addonBefore="Problema"
            value={problema}
            onChange={(e) => setProblema(e.target.value)}
            disabled={!puedeEditar}
            style={{ marginBottom: 12 }}
          />
          {porques.map((p, i) => (
            <Space key={i} align="start" style={{ display: 'flex', marginBottom: 8 }}>
              <Input
                style={{ width: 220 }}
                value={p.pregunta}
                onChange={(e) => setPorques((prev) => prev.map((x, j) => (j === i ? { ...x, pregunta: e.target.value } : x)))}
                disabled={!puedeEditar}
              />
              <Input.TextArea
                style={{ width: 380 }}
                autoSize
                placeholder="Respuesta"
                value={p.respuesta}
                onChange={(e) => setPorques((prev) => prev.map((x, j) => (j === i ? { ...x, respuesta: e.target.value } : x)))}
                disabled={!puedeEditar}
              />
              {puedeEditar && (
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setPorques((prev) => prev.filter((_, j) => j !== i))} />
              )}
            </Space>
          ))}
          {puedeEditar && porques.length < 8 && (
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => setPorques((prev) => [...prev, { pregunta: '¿Por qué?', respuesta: '' }])}
            >
              Agregar porqué
            </Button>
          )}
        </Card>
      )}

      {metodologia === 'ISHIKAWA' && (
        <Card size="small" title="Diagrama de Ishikawa">
          <Input
            addonBefore="Efecto"
            value={efecto}
            onChange={(e) => setEfecto(e.target.value)}
            disabled={!puedeEditar}
            style={{ marginBottom: 12 }}
          />
          {categorias.map((cat, ci) => (
            <div key={cat.nombre} style={{ marginBottom: 12 }}>
              <Text strong>{cat.nombre}</Text>
              {cat.causas.map((c, i) => (
                <Space key={i} style={{ display: 'flex', marginTop: 4 }}>
                  <Input
                    style={{ width: 480 }}
                    value={c}
                    onChange={(e) =>
                      setCategorias((prev) =>
                        prev.map((x, j) =>
                          j === ci ? { ...x, causas: x.causas.map((y, k) => (k === i ? e.target.value : y)) } : x,
                        ),
                      )
                    }
                    disabled={!puedeEditar}
                  />
                  {puedeEditar && (
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() =>
                        setCategorias((prev) =>
                          prev.map((x, j) => (j === ci ? { ...x, causas: x.causas.filter((_, k) => k !== i) } : x)),
                        )
                      }
                    />
                  )}
                </Space>
              ))}
              {puedeEditar && (
                <Button
                  size="small"
                  type="dashed"
                  style={{ marginTop: 4 }}
                  icon={<PlusOutlined />}
                  onClick={() => setCategorias((prev) => prev.map((x, j) => (j === ci ? { ...x, causas: [...x.causas, ''] } : x)))}
                >
                  Causa
                </Button>
              )}
            </div>
          ))}
        </Card>
      )}

      {metodologia === 'LLUVIA_CAUSAS' && (
        <Card size="small" title="Lluvia de causas y validación">
          {lluvia.map((c, i) => (
            <Space key={i} align="start" style={{ display: 'flex', marginBottom: 8 }}>
              <Checkbox
                checked={c.validada}
                disabled={!puedeEditar}
                onChange={(e) => setLluvia((prev) => prev.map((x, j) => (j === i ? { ...x, validada: e.target.checked } : x)))}
              >
                válida
              </Checkbox>
              <Input
                style={{ width: 400 }}
                value={c.causa}
                onChange={(e) => setLluvia((prev) => prev.map((x, j) => (j === i ? { ...x, causa: e.target.value } : x)))}
                disabled={!puedeEditar}
              />
              <Input
                style={{ width: 220 }}
                placeholder="Comentario"
                value={c.comentario}
                onChange={(e) => setLluvia((prev) => prev.map((x, j) => (j === i ? { ...x, comentario: e.target.value } : x)))}
                disabled={!puedeEditar}
              />
              {puedeEditar && (
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setLluvia((prev) => prev.filter((_, j) => j !== i))} />
              )}
            </Space>
          ))}
          {puedeEditar && (
            <Button type="dashed" icon={<PlusOutlined />} onClick={() => setLluvia((prev) => [...prev, { causa: '', validada: false }])}>
              Agregar causa
            </Button>
          )}
        </Card>
      )}

      {metodologia === 'OTRO' && (
        <Card size="small" title="Análisis narrativo">
          <Input.TextArea rows={6} value={textoOtro} onChange={(e) => setTextoOtro(e.target.value)} disabled={!puedeEditar} />
        </Card>
      )}

      <Card size="small" title="Conclusión del análisis">
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <div>
            <Text type="secondary">Causa inmediata</Text>
            <Input.TextArea rows={2} value={causaInmediata} onChange={(e) => setCausaInmediata(e.target.value)} disabled={!puedeEditar} />
          </div>
          <div>
            <Text type="secondary">Causa contribuyente (opcional)</Text>
            <Input.TextArea rows={2} value={causaContribuyente} onChange={(e) => setCausaContribuyente(e.target.value)} disabled={!puedeEditar} />
          </div>
          <div>
            <Text type="secondary">
              Causa raíz <Text type="danger">*</Text> — necesaria para aprobar el plan
            </Text>
            <Input.TextArea rows={2} value={causaRaiz} onChange={(e) => setCausaRaiz(e.target.value)} disabled={!puedeEditar} />
          </div>
          <div>
            <Text type="secondary">Comentarios del equipo de análisis</Text>
            <Input.TextArea rows={2} value={comentarios} onChange={(e) => setComentarios(e.target.value)} disabled={!puedeEditar} />
          </div>
        </Space>
      </Card>

      {puedeEditar && (
        <Button type="primary" onClick={() => guardar.mutate()} loading={guardar.isPending}>
          Guardar análisis
        </Button>
      )}
      {!puedeEditar && a?.elaboradoAt && (
        <Paragraph type="secondary">Elaborado el {new Date(a.elaboradoAt).toLocaleDateString()}</Paragraph>
      )}
    </Space>
  )
}
