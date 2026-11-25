import PDFDocument from 'pdfkit';
import type { MccService } from './mcc.service';

type Informe = Awaited<ReturnType<MccService['informe']>>;

const AZUL = '#00629b';
const AZUL_OSCURO = '#012a44';
const DORADO = '#d4a017';
const GRIS = '#595959';
const GRIS_CLARO = '#d9d9d9';
const FONDO = '#f5f7fa';
const VERDE = '#389e0d';
const ROJO = '#cf1322';
const AMBAR = '#d48806';

const TIPO: Record<string, string> = {
  NO_CONFORMIDAD: 'No conformidad',
  SALIDA_NO_CONFORME: 'Salida no conforme',
  ENTRADA_NO_CONFORME: 'Entrada no conforme',
  QUEJA: 'Queja',
  FELICITACION: 'Felicitación',
  SUGERENCIA: 'Sugerencia',
  OTRO: 'Otro',
  SIN_CLASIFICAR: 'Sin clasificar',
};

const lempiras = (n: number) =>
  `L. ${n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Informe del Control MCC para presentar a la dirección (A4, con membrete y firmas). */
export function generarInformeMccPdf(d: Informe): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 42,
    bufferPages: true,
    info: { Title: 'Informe del Control MCC', Author: 'Calidad 360 Hospitalaria' },
  });
  const ancho = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const t = d.tablero;
  const k = t.kpis;

  membrete(doc, d, ancho);

  // 1. Resumen en tarjetas
  titulo(doc, '1. Resumen del periodo');
  tarjetas(doc, ancho, [
    { etiqueta: 'Registros', valor: String(k.total), color: AZUL },
    { etiqueta: '% de cierre efectivo', valor: `${k.porcentajeCierre}%`, detalle: `${k.cerrados} de ${k.baseCierre}`, color: VERDE },
    { etiqueta: 'Abiertos / seguimiento', valor: String(k.abiertos + k.seguimiento), detalle: `${k.abiertos} ab · ${k.seguimiento} seg`, color: AMBAR },
    { etiqueta: 'Fecha de cierre vencida', valor: String(k.vencidos), detalle: `${k.porVencer} por vencer en 7 días`, color: ROJO },
  ]);
  tarjetas(doc, ancho, [
    { etiqueta: 'Costo de la no calidad', valor: lempiras(k.costoTotal), color: '#722ed1' },
    {
      etiqueta: 'Safety Clock',
      valor: t.safetyClock.dias === null ? '—' : `${t.safetyClock.dias} días`,
      detalle: 'desde el último hallazgo crítico',
      color: DORADO,
    },
    { etiqueta: 'ACyP vencidas', valor: String(t.acyp.vencidas), detalle: `${t.acyp.completadas} completadas de ${t.acyp.total}`, color: ROJO },
    { etiqueta: 'Escalados a hallazgo', valor: String(d.escalados), detalle: 'siguen el ciclo ISO completo', color: AZUL_OSCURO },
  ]);

  // 2. Estado y ACyP
  titulo(doc, '2. Estado de los registros y de las acciones ACyP');
  const y0 = doc.y;
  const mitad = ancho / 2 - 8;
  tabla(doc, mitad, [
    { titulo: 'Estatus', ancho: 0.55 },
    { titulo: 'Cantidad', ancho: 0.22, alinear: 'right' },
    { titulo: '%', ancho: 0.23, alinear: 'right' },
  ], t.matrizEstado.map((m) => [
    { ABIERTO: 'Abierto', EN_SEGUIMIENTO: 'En seguimiento', CERRADO: 'Cerrado', DESESTIMADO: 'Desestimado / rechazado', SIN_ESTADO: 'Sin estado (histórico)' }[m.estatus] ?? m.estatus,
    String(m.cantidad),
    `${m.porcentaje}%`,
  ]), doc.page.margins.left);
  const yFinIzq = doc.y;
  doc.y = y0;
  barras(doc, doc.page.margins.left + mitad + 16, mitad, 110, [
    { nombre: 'Pendientes', valor: t.acyp.pendientes, color: '#ff4d4f' },
    { nombre: 'Seguimiento', valor: t.acyp.seguimiento, color: '#faad14' },
    { nombre: 'Completadas', valor: t.acyp.completadas, color: '#52c41a' },
    { nombre: 'Vencidas', valor: t.acyp.vencidas, color: '#820014' },
  ]);
  doc.y = Math.max(doc.y, yFinIzq) + 10;

  // 3. Por tipo de registro
  titulo(doc, '3. Por tipo de registro');
  tabla(doc, ancho, [
    { titulo: 'Tipo', ancho: 0.26 },
    { titulo: 'Total', ancho: 0.09, alinear: 'right' },
    { titulo: '% total', ancho: 0.1, alinear: 'right' },
    { titulo: 'Cerrados', ancho: 0.11, alinear: 'right' },
    { titulo: 'Abiertos', ancho: 0.11, alinear: 'right' },
    { titulo: 'Seguim.', ancho: 0.11, alinear: 'right' },
    { titulo: 'Vencidos', ancho: 0.11, alinear: 'right' },
    { titulo: '% cierre', ancho: 0.11, alinear: 'right' },
  ], t.porTipo.map((p) => [
    TIPO[p.tipo] ?? p.tipo, String(p.total), `${p.porcentaje}%`, String(p.cerrados), String(p.abiertos),
    String(p.seguimiento), String(p.vencidos), `${p.porcentajeCierre}%`,
  ]));

  // 4. Tendencia
  titulo(doc, '4. Tendencia de los últimos 12 meses');
  tendencia(doc, ancho, d.tendencia);

  // 5. Por macroproceso
  titulo(doc, '5. Consolidado por macroproceso');
  tabla(doc, ancho, [
    { titulo: 'Macroproceso', ancho: 0.3 },
    { titulo: 'Total', ancho: 0.09, alinear: 'right' },
    { titulo: 'Abiertos', ancho: 0.1, alinear: 'right' },
    { titulo: 'Seguim.', ancho: 0.1, alinear: 'right' },
    { titulo: 'Cerrados', ancho: 0.1, alinear: 'right' },
    { titulo: 'Vencidos', ancho: 0.1, alinear: 'right' },
    { titulo: '% cierre', ancho: 0.1, alinear: 'right' },
    { titulo: 'ACyP venc.', ancho: 0.11, alinear: 'right' },
  ], d.porMacroproceso.map((m) => [
    m.macroproceso, String(m.total), String(m.abiertos), String(m.seguimiento), String(m.cerrados),
    String(m.vencidos), `${m.porcentajeCierre}%`, String(m.acypVencidas),
  ]));

  // 6. Áreas con más registros
  titulo(doc, '6. Áreas con más registros (top 15)');
  tabla(doc, ancho, [
    { titulo: 'Área', ancho: 0.32 },
    { titulo: 'Macroproceso', ancho: 0.26 },
    { titulo: 'Total', ancho: 0.1, alinear: 'right' },
    { titulo: 'Cerrados', ancho: 0.11, alinear: 'right' },
    { titulo: 'Ab. / seg.', ancho: 0.11, alinear: 'right' },
    { titulo: 'Otros', ancho: 0.1, alinear: 'right' },
  ], t.porArea.map((a) => [a.area, a.macroproceso ?? '—', `${a.total} (${a.porcentaje}%)`, String(a.cerrados), String(a.abiertos), String(a.otros)]));

  // 7. Vencidos
  titulo(doc, `7. Registros con fecha de cierre vencida (${d.vencidos.length})`);
  if (!d.vencidos.length) {
    doc.fillColor(GRIS).font('Helvetica').fontSize(10).text('No hay registros vencidos en el periodo. ¡Bien!');
    doc.moveDown(0.8);
  } else {
    tabla(doc, ancho, [
      { titulo: 'Código', ancho: 0.14 },
      { titulo: 'Problema', ancho: 0.32 },
      { titulo: 'Área', ancho: 0.18 },
      { titulo: 'Responsable', ancho: 0.17 },
      { titulo: 'Límite', ancho: 0.11 },
      { titulo: 'Días', ancho: 0.08, alinear: 'right' },
    ], d.vencidos.slice(0, 60).map((v) => [
      v.hallazgo ? `${v.codigo}\nHallazgo ${v.hallazgo}` : v.codigo, v.titulo, v.area, v.responsable, v.fechaLimite, String(v.dias),
    ]), undefined, ROJO);
    if (d.vencidos.length > 60) {
      doc.fillColor(GRIS).font('Helvetica-Oblique').fontSize(8.5).text(`… y ${d.vencidos.length - 60} más (ver la exportación a Excel).`);
    }
  }

  firmas(doc, ancho);
  piePagina(doc);
  doc.end();
  return doc;
}

// ── Piezas ──────────────────────────────────────────────────────────────────

function membrete(doc: PDFKit.PDFDocument, d: Informe, ancho: number) {
  const x = doc.page.margins.left;
  doc.rect(x, doc.y, ancho, 4).fill(AZUL);
  doc.moveDown(0.8);
  doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(9.5).text(d.organizacion.toUpperCase(), { characterSpacing: 1 });
  doc.moveDown(0.15);
  doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(19).text('Informe del Control MCC');
  doc.fillColor(GRIS).font('Helvetica').fontSize(10).text('Mejora Continua de la Calidad · no conformidades, quejas, felicitaciones y sugerencias');
  doc.moveDown(0.4);
  doc.fillColor('#262626').font('Helvetica-Bold').fontSize(10).text(`Periodo: `, { continued: true }).font('Helvetica').text(d.periodo);
  if (d.filtros.length) doc.font('Helvetica-Bold').text('Filtros: ', { continued: true }).font('Helvetica').text(d.filtros.join(' · '));
  doc
    .fillColor(GRIS)
    .fontSize(9)
    .text(`Generado el ${new Date(d.generadoAt).toLocaleString('es-HN', { dateStyle: 'long', timeStyle: 'short' })}`);
  doc.moveDown(0.8);
}

function saltoSiFalta(doc: PDFKit.PDFDocument, alto: number) {
  if (doc.y + alto > doc.page.height - doc.page.margins.bottom) doc.addPage();
}

function titulo(doc: PDFKit.PDFDocument, texto: string) {
  saltoSiFalta(doc, 70);
  const x = doc.page.margins.left;
  doc.rect(x, doc.y + 2, 3, 13).fill(DORADO);
  doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(12.5).text(texto, x + 9, doc.y);
  doc.x = x;
  doc.moveDown(0.45);
}

function tarjetas(doc: PDFKit.PDFDocument, ancho: number, items: { etiqueta: string; valor: string; detalle?: string; color: string }[]) {
  const alto = 56;
  saltoSiFalta(doc, alto + 10);
  const gap = 8;
  const w = (ancho - gap * (items.length - 1)) / items.length;
  const y = doc.y;
  items.forEach((it, i) => {
    const x = doc.page.margins.left + i * (w + gap);
    doc.roundedRect(x, y, w, alto, 5).fill(FONDO);
    doc.rect(x, y, 3, alto).fill(it.color);
    doc.fillColor(GRIS).font('Helvetica').fontSize(7.5).text(it.etiqueta.toUpperCase(), x + 9, y + 7, { width: w - 14 });
    doc.fillColor(it.color).font('Helvetica-Bold').fontSize(15).text(it.valor, x + 9, y + 19, { width: w - 14 });
    if (it.detalle) doc.fillColor(GRIS).font('Helvetica').fontSize(7.5).text(it.detalle, x + 9, y + 40, { width: w - 14 });
  });
  doc.x = doc.page.margins.left;
  doc.y = y + alto + 8;
}

interface Col {
  titulo: string;
  ancho: number; // fracción del ancho total
  alinear?: 'left' | 'right';
}

/** Tabla con encabezado (que se repite al cambiar de página) y filas alternadas. */
function tabla(doc: PDFKit.PDFDocument, ancho: number, cols: Col[], filas: string[][], x0?: number, colorEncabezado = AZUL_OSCURO) {
  const x = x0 ?? doc.page.margins.left;
  const pad = 4;
  const encabezado = () => {
    const y = doc.y;
    doc.rect(x, y, ancho, 17).fill(colorEncabezado);
    let cx = x;
    for (const c of cols) {
      const w = c.ancho * ancho;
      doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8).text(c.titulo, cx + pad, y + 5, { width: w - pad * 2, align: c.alinear ?? 'left', lineBreak: false });
      cx += w;
    }
    doc.y = y + 17;
  };
  if (!filas.length) {
    doc.fillColor(GRIS).font('Helvetica').fontSize(9.5).text('Sin datos.', x);
    doc.moveDown(0.8);
    return;
  }
  saltoSiFalta(doc, 40);
  encabezado();
  filas.forEach((f, i) => {
    doc.font('Helvetica').fontSize(8.5);
    const alto = Math.max(15, ...f.map((v, j) => doc.heightOfString(v, { width: cols[j].ancho * ancho - pad * 2 }) + 6));
    if (doc.y + alto > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      encabezado();
    }
    const y = doc.y;
    if (i % 2) doc.rect(x, y, ancho, alto).fill(FONDO);
    let cx = x;
    f.forEach((v, j) => {
      const w = cols[j].ancho * ancho;
      doc.fillColor('#262626').font(j === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5)
        .text(v, cx + pad, y + 3, { width: w - pad * 2, align: cols[j].alinear ?? 'left' });
      cx += w;
    });
    doc.moveTo(x, y + alto).lineTo(x + ancho, y + alto).strokeColor(GRIS_CLARO).lineWidth(0.4).stroke();
    doc.y = y + alto;
  });
  doc.x = doc.page.margins.left;
  doc.moveDown(0.8);
}

function barras(doc: PDFKit.PDFDocument, x: number, ancho: number, alto: number, datos: { nombre: string; valor: number; color: string }[]) {
  const y = doc.y;
  const max = Math.max(1, ...datos.map((d) => d.valor));
  const total = datos.reduce((s, d) => s + d.valor, 0);
  const w = ancho / datos.length;
  datos.forEach((d, i) => {
    const h = (d.valor / max) * (alto - 30);
    const bx = x + i * w + w * 0.18;
    const bw = w * 0.64;
    doc.rect(bx, y + (alto - 18) - h, bw, h).fill(d.color);
    doc.fillColor('#262626').font('Helvetica-Bold').fontSize(8)
      .text(`${d.valor}${total ? ` (${Math.round((d.valor / total) * 100)}%)` : ''}`, x + i * w, y + (alto - 18) - h - 11, { width: w, align: 'center' });
    doc.fillColor(GRIS).font('Helvetica').fontSize(7.5).text(d.nombre, x + i * w, y + alto - 14, { width: w, align: 'center' });
  });
  doc.y = y + alto;
}

function tendencia(doc: PDFKit.PDFDocument, ancho: number, meses: Informe['tendencia']) {
  const alto = 130;
  saltoSiFalta(doc, alto + 60);
  const x = doc.page.margins.left;
  const y = doc.y;
  const max = Math.max(1, ...meses.flatMap((m) => [m.registrados, m.cerrados]));
  const w = ancho / meses.length;
  const base = y + alto - 16;
  doc.moveTo(x, base).lineTo(x + ancho, base).strokeColor(GRIS_CLARO).lineWidth(0.6).stroke();
  meses.forEach((m, i) => {
    const bw = w * 0.32;
    const hx = x + i * w + w * 0.14;
    const hR = (m.registrados / max) * (alto - 34);
    const hC = (m.cerrados / max) * (alto - 34);
    doc.rect(hx, base - hR, bw, hR).fill(AZUL);
    doc.rect(hx + bw + 2, base - hC, bw, hC).fill(VERDE);
    if (m.registrados) doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(6.5).text(String(m.registrados), hx - 3, base - hR - 9, { width: bw + 6, align: 'center' });
    if (m.cerrados) doc.fillColor(VERDE).font('Helvetica-Bold').fontSize(6.5).text(String(m.cerrados), hx + bw - 1, base - hC - 9, { width: bw + 6, align: 'center' });
    doc.fillColor(GRIS).font('Helvetica').fontSize(7).text(m.etiqueta, x + i * w, base + 4, { width: w, align: 'center' });
  });
  doc.y = y + alto + 2;
  doc.x = x;
  const ly = doc.y;
  doc.rect(x, ly + 2, 8, 8).fill(AZUL);
  doc.fillColor('#262626').font('Helvetica').fontSize(8).text('Registrados en el mes', x + 12, ly + 1);
  doc.rect(x + 120, ly + 2, 8, 8).fill(VERDE);
  doc.fillColor('#262626').text('Cerrados en el mes', x + 132, ly + 1);
  doc.x = x;
  doc.y = ly + 16;
  const conCosto = meses.filter((m) => m.costo > 0);
  if (conCosto.length) {
    doc.fillColor(GRIS).font('Helvetica').fontSize(8.5)
      .text(`Costo de la no calidad por mes: ${conCosto.map((m) => `${m.etiqueta} ${lempiras(m.costo)}`).join(' · ')}`, { width: ancho });
  }
  doc.moveDown(0.8);
}

function firmas(doc: PDFKit.PDFDocument, ancho: number) {
  saltoSiFalta(doc, 80);
  doc.moveDown(2);
  const y = doc.y;
  const x = doc.page.margins.left;
  const w = ancho / 2 - 24;
  doc.moveTo(x, y).lineTo(x + w, y).strokeColor('#262626').lineWidth(0.7).stroke();
  doc.moveTo(x + ancho - w, y).lineTo(x + ancho, y).stroke();
  doc.fillColor(GRIS).font('Helvetica').fontSize(9)
    .text('Elaboró — Gestión de Calidad', x, y + 5, { width: w })
    .text('Revisó — Dirección', x + ancho - w, y + 5, { width: w });
}

function piePagina(doc: PDFKit.PDFDocument) {
  const { count } = doc.bufferedPageRange();
  for (let i = 0; i < count; i++) {
    doc.switchToPage(i);
    const inferior = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // evita que PDFKit agregue una página en blanco por el pie
    doc.fillColor('#8c8c8c').font('Helvetica').fontSize(7.5).text(
      `Calidad 360 Hospitalaria · Informe del Control MCC · Página ${i + 1} de ${count}`,
      doc.page.margins.left,
      doc.page.height - 26,
      { width: doc.page.width - doc.page.margins.left - doc.page.margins.right, align: 'center', lineBreak: false },
    );
    doc.page.margins.bottom = inferior;
  }
}
