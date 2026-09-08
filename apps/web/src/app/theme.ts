import type { ThemeConfig } from 'antd'

/** Colores del semáforo institucional (verde / amarillo / rojo). */
export const semaforo = {
  verde: '#389e0d',
  verdeBg: '#f6ffed',
  amarillo: '#d48806',
  amarilloBg: '#fffbe6',
  rojo: '#cf1322',
  rojoBg: '#fff1f0',
  gris: '#8c8c8c',
  grisBg: '#fafafa',
} as const

export type EstadoSemaforo = 'verde' | 'amarillo' | 'rojo' | 'gris'

/** Tema base de Ant Design para Calidad 360. */
export const themeCalidad360: ThemeConfig = {
  token: {
    colorPrimary: '#00629b',
    colorInfo: '#00629b',
    colorSuccess: semaforo.verde,
    colorWarning: semaforo.amarillo,
    colorError: semaforo.rojo,
    borderRadius: 6,
    fontFamily:
      "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      headerHeight: 56,
      siderBg: '#001f33',
      bodyBg: '#f0f2f5',
    },
    Menu: {
      darkItemBg: '#001f33',
      darkSubMenuItemBg: '#001a2b',
    },
  },
}
