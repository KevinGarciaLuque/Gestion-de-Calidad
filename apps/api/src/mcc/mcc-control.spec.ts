import { calcularTablero, plazoDe, type FilaControl } from './mcc-control';
import { aEstatus, aFecha, aNumero, aTipo, interpretarFila, mapearEncabezados, parseCsv } from './mcc-import';
import { COLUMNAS_EXPORTACION } from './mcc.service';

const hoy = new Date(2026, 10, 25);

function fila(p: Partial<FilaControl>): FilaControl {
  return {
    id: Math.random().toString(36), codigo: 'MCC-1', codigoTipo: null, tipoRegistro: 'NO_CONFORMIDAD', estado: 'NUEVO',
    fecha: new Date(2026, 10, 1), macroproceso: 'DAF', area: 'BIOMÉDICA', impacto: null, prioridad: null,
    requiereAcyp: false, acypCodigo: null, compromisosAdquiridos: null, compromisosCumplidos: null,
    fechaLimite: null, costoCalidad: 0, accionesTotal: 0, accionesTerminadas: 0, ...p,
  };
}

describe('importación CSV', () => {
  it('parsea comillas, separador ; y saltos de línea dentro de campos', () => {
    const f = parseCsv('﻿ID;Descripción del Hallazgo;Costo (L)\nMCC-00001;"Línea 1\nLínea ""2""";"1.234,50"\n');
    expect(f).toEqual([['ID', 'Descripción del Hallazgo', 'Costo (L)'], ['MCC-00001', 'Línea 1\nLínea "2"', '1.234,50']]);
  });

  it('reconoce encabezados sin importar tildes y signos', () => {
    const { reconocidas, ignoradas } = mapearEncabezados(['Tipo de Registro', '¿Cuál es el Problema Principal?', 'N° Expediente', 'LEAN · Espera', 'Columna rara']);
    expect(reconocidas).toEqual(['tipoRegistro', 'problemaPrincipal', 'numeroExpediente', 'leanEspera']);
    expect(ignoradas).toEqual(['Columna rara']);
  });

  it('convierte valores', () => {
    expect(aTipo('SALIDA NO CONFORME')).toBe('SALIDA_NO_CONFORME');
    expect(aTipo('No Conformidad')).toBe('NO_CONFORMIDAD');
    expect(aTipo('Felicitación')).toBe('FELICITACION');
    expect(aEstatus('EN SEGUIMIENTO')).toBe('EN_SEGUIMIENTO');
    expect(aEstatus('DESESTIMADO / RECHAZADO')).toBe('DESESTIMADO');
    expect(aEstatus('')).toBe('SIN_ESTADO');
    expect(aNumero('L. 1,234.56')).toBe(1234.56);
    expect(aNumero('1.234,5')).toBe(1234.5);
    expect(aNumero('NO APLICA')).toBeNull();
    expect(aFecha('18/11/2026')).toEqual(new Date(2026, 10, 18));
    expect(aFecha('2026-11-04 09:41')).toEqual(new Date(2026, 10, 4, 9, 41));
    expect(aFecha('11/25/2026')).toEqual(new Date(2026, 10, 25));
    expect(aFecha('31/02/2026')).toBe('invalida');
  });

  it('interpreta una fila completa', () => {
    const enc = ['ID', 'Tipo de Registro', 'Código', 'Descripción del Hallazgo', 'Estatus de Cierre', '¿Requiere ACyP?', 'Costo (L)', 'Fecha Límite / Cierre Máx.'];
    const { indice } = mapearEncabezados(enc);
    const r = interpretarFila(['mcc-00300', 'NO CONFORMIDAD', 'nc-175-2026', 'Doctora no envía…', 'ABIERTO', 'SI', '1500', 'fecha mala'], indice, 2);
    if ('error' in r) throw new Error(r.error);
    expect(r.codigo).toBe('MCC-00300');
    expect(r.datos.codigoTipo).toBe('NC-175-2026');
    expect(r.estado).toBe('NUEVO');
    expect(r.datos.requiereAcyp).toBe(true);
    expect(r.datos.costoCalidad).toBe(1500);
    expect(r.datos.fechaLimite).toBeNull();
    expect(r.advertencias).toHaveLength(1);
  });
});

describe('exportación ↔ importación', () => {
  it('el importador reconoce todas las columnas exportadas (salvo las calculadas)', () => {
    const { ignoradas, reconocidas } = mapearEncabezados(COLUMNAS_EXPORTACION.map((c) => c.label));
    expect(ignoradas.sort()).toEqual(['% Cump.', 'Hallazgo formal', 'Indicador de Criterio', 'Mes']);
    expect(reconocidas).toHaveLength(COLUMNAS_EXPORTACION.length - 4);
  });

  it('los textos exportados se vuelven a leer igual', () => {
    expect(aTipo('FELICITACIÓN')).toBe('FELICITACION');
    expect(aEstatus('EN SEGUIMIENTO')).toBe('EN_SEGUIMIENTO');
    expect(aNumero('12500,50')).toBe(12500.5);
    expect(aFecha('04/11/2026 08:30')).toEqual(new Date(2026, 10, 4, 8, 30));
  });
});

describe('tablero', () => {
  it('semaforo de plazo', () => {
    expect(plazoDe('ABIERTO', new Date(2026, 10, 17), hoy)).toEqual({ situacion: 'VENCIDO', dias: 8 });
    expect(plazoDe('ABIERTO', new Date(2026, 10, 30), hoy)).toEqual({ situacion: 'POR_VENCER', dias: 5 });
    expect(plazoDe('CERRADO', new Date(2026, 10, 1), hoy).situacion).toBe('CERRADO');
  });

  it('% de cierre excluye desestimados y sin estado (como la hoja original)', () => {
    const t = calcularTablero(
      [
        fila({ estado: 'CERRADO' }),
        fila({ estado: 'CERRADO' }),
        fila({ estado: 'EN_EJECUCION', requiereAcyp: true, fechaLimite: new Date(2026, 10, 1) }),
        fila({ estado: 'NO_PROCEDE' }),
        fila({ estado: 'SIN_ESTADO', tipoRegistro: null }),
        fila({ estado: 'NUEVO', impacto: 'ALTO', fecha: new Date(2026, 10, 18), costoCalidad: 250.5 }),
        fila({ estado: 'NUEVO', impacto: 'CRÍTICO', fecha: new Date(2026, 10, 25), sinFechaRecepcion: true }),
      ],
      hoy,
    );
    expect(t.kpis.total).toBe(7);
    expect(t.kpis.porcentajeCierre).toBe(40); // 2 / (7 - 1 - 1)
    expect(t.kpis.vencidos).toBe(1);
    expect(t.kpis.costoTotal).toBe(250.5);
    expect(t.acyp.vencidas).toBe(1);
    expect(t.safetyClock.dias).toBe(7);
    expect(t.porTipo.map((p) => p.tipo)).toEqual(['NO_CONFORMIDAD', 'SIN_CLASIFICAR']);
    expect(t.consolidado[0]).toMatchObject({ macroproceso: 'DAF', area: 'BIOMÉDICA', total: 7, cerrados: 2 });
  });
});
