import { Component, type ReactNode } from 'react'
import { capturarExcepcion } from '@/lib/sentry'

interface Props {
  children: ReactNode
  fallback: ReactNode
}

interface State {
  conError: boolean
}

/** Atrapa errores de render y los reporta a Sentry (si está activo) sin depender de su paquete para pintar el fallback. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { conError: false }

  static getDerivedStateFromError(): State {
    return { conError: true }
  }

  componentDidCatch(error: unknown): void {
    capturarExcepcion(error)
  }

  render() {
    return this.state.conError ? this.props.fallback : this.props.children
  }
}
