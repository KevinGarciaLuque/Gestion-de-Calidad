import { DownloadOutlined, PrinterOutlined } from '@ant-design/icons'
import { Alert, Button, Empty, Flex, Spin } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import type { VersionFicha } from './procesosApi'

/** Quita caracteres que rompen la sintaxis de Mermaid y recorta. */
function limpiar(s: string | number | undefined | null, max = 90): string {
  const t = String(s ?? '')
    .replace(/[<>"'`|{}();#\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

/** Construye la definición Mermaid del flujograma a partir de la ficha. */
export function construirDefinicion(version: Pick<VersionFicha, 'actividades' | 'entradas' | 'salidas'>): string {
  const acts = [...(version.actividades ?? [])]
    .filter((a) => (a.actividad ?? '').trim())
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))

  if (acts.length === 0) return ''

  const L: string[] = ['flowchart TD']

  const entradas = (version.entradas ?? [])
    .map((e) => limpiar(e.insumo || e.proveedor, 40))
    .filter(Boolean)
    .slice(0, 5)
  const salidas = (version.salidas ?? [])
    .map((s) => limpiar(s.salida, 40))
    .filter(Boolean)
    .slice(0, 5)

  const iniTexto = entradas.length
    ? `<b>Entradas</b><br/>${entradas.map((x) => `• ${x}`).join('<br/>')}`
    : 'Inicio'
  const finTexto = salidas.length
    ? `<b>Salidas</b><br/>${salidas.map((x) => `• ${x}`).join('<br/>')}`
    : 'Fin'

  L.push(`  ini(["${iniTexto}"])`)
  L.push(`  fin(["${finTexto}"])`)

  acts.forEach((a, i) => {
    const num = a.orden ?? i + 1
    const resp = limpiar(a.responsable, 40)
    const label = `<b>${num}.</b> ${limpiar(a.actividad, 110)}${resp ? `<br/><i>${resp}</i>` : ''}`
    L.push(`  n${i}["${label}"]`)
  })

  const flecha = (from: string, to: string, control?: string | null) => {
    const c = limpiar(control, 55)
    return c ? `  ${from} -->|"✔ ${c}"| ${to}` : `  ${from} --> ${to}`
  }

  L.push(flecha('ini', 'n0', acts[0]?.puntoControl))
  for (let i = 0; i < acts.length - 1; i++) {
    L.push(flecha(`n${i}`, `n${i + 1}`, acts[i + 1]?.puntoControl))
  }
  L.push(`  n${acts.length - 1} --> fin`)

  // Estilos
  L.push('  classDef paso fill:#ffffff,stroke:#00629b,stroke-width:1px,color:#1f1f1f;')
  L.push('  classDef borde fill:#eef4f8,stroke:#00629b,stroke-width:1.5px,color:#012a44;')
  L.push(`  class ${acts.map((_, i) => `n${i}`).join(',')} paso;`)
  L.push('  class ini,fin borde;')

  return L.join('\n')
}

let mermaidListo = false
async function cargarMermaid() {
  const mod = await import('mermaid')
  const mermaid = mod.default
  if (!mermaidListo) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: 'neutral',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      flowchart: { htmlLabels: true, curve: 'linear', nodeSpacing: 40, rankSpacing: 50, padding: 8 },
    })
    mermaidListo = true
  }
  return mermaid
}

/** Renderiza una definición Mermaid a SVG. Reutilizable (vista y editor). */
export function MermaidVista({ definicion, id }: { definicion: string; id: string }) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!definicion.trim()) {
      setSvg('')
      setError('')
      return
    }
    let cancel = false
    cargarMermaid()
      .then((m) => m.render(`mmd-${id}-${Date.now()}`, definicion))
      .then(({ svg }) => !cancel && (setSvg(svg), setError('')))
      .catch((e: unknown) => !cancel && setError(e instanceof Error ? e.message : 'Error de sintaxis'))
    return () => {
      cancel = true
    }
  }, [definicion, id])

  if (error) return <Alert type="warning" showIcon message="El diagrama tiene un error de sintaxis" description={error} />
  if (!svg) return <div style={{ color: '#bfbfbf', padding: 24, textAlign: 'center' }}>Sin diagrama</div>
  return (
    <div
      style={{ overflowX: 'auto', textAlign: 'center' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

export function Flujograma({ version }: { version: VersionFicha }) {
  const definicion = useMemo(
    () => (version.flujograma?.trim() ? version.flujograma : construirDefinicion(version)),
    [version],
  )
  const esManual = !!version.flujograma?.trim()
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (!definicion) {
      setSvg('')
      return
    }
    let cancelado = false
    setCargando(true)
    setError('')
    cargarMermaid()
      .then((mermaid) => mermaid.render(`flujo-${version.id}-${Date.now()}`, definicion))
      .then(({ svg }) => {
        if (!cancelado) setSvg(svg)
      })
      .catch((e: unknown) => {
        if (!cancelado) setError(e instanceof Error ? e.message : 'No se pudo generar el flujograma')
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })
    return () => {
      cancelado = true
    }
  }, [definicion, version.id])

  const descargarSvg = () => {
    if (!svg) return
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `flujograma-v${version.numero}.svg`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const imprimir = () => {
    if (!svg) return
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) return
    w.document.write(
      `<html><head><title>Flujograma</title></head><body style="margin:24px;font-family:sans-serif">${svg}</body></html>`,
    )
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }

  if (!definicion) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Agrega actividades a la ficha para ver el flujograma."
      />
    )
  }

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={8} style={{ marginBottom: 12 }}>
        <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 13 }}>
          {esManual
            ? `Flujograma editado a mano (versión ${version.numero}). Se edita desde la ficha.`
            : `Generado automáticamente desde las actividades de la ficha (versión ${version.numero}).`}
        </span>
        <Flex gap={8}>
          <Button size="small" icon={<DownloadOutlined />} onClick={descargarSvg} disabled={!svg}>
            SVG
          </Button>
          <Button size="small" icon={<PrinterOutlined />} onClick={imprimir} disabled={!svg}>
            Imprimir
          </Button>
        </Flex>
      </Flex>

      {error && <Alert type="error" showIcon message="Error al generar el flujograma" description={error} />}

      {cargando && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      )}

      <div
        style={{
          overflowX: 'auto',
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          padding: 16,
          background: '#fff',
          textAlign: 'center',
        }}
        // El SVG viene de Mermaid a partir de datos ya saneados.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </>
  )
}
