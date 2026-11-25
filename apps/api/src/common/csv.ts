/** Marca de orden de bytes UTF-8: hace que Excel abra el archivo respetando tildes y ñ. */
export const BOM = String.fromCharCode(0xfeff);

/**
 * CSV pensado para abrirse directo en Excel en español: separador ";" y BOM UTF-8.
 * Comillas y saltos de línea dentro de un campo se escapan.
 */
export function aCsv(columnas: { key: string; label: string }[], filas: Record<string, string | number | null | undefined>[]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const cabecera = columnas.map((c) => esc(c.label)).join(';');
  const cuerpo = filas.map((f) => columnas.map((c) => esc(f[c.key])).join(';')).join('\r\n');
  return `${BOM}${cabecera}\r\n${cuerpo}\r\n`;
}
