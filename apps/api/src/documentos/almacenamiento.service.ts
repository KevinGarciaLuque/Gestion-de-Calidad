import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Readable } from 'node:stream';
import type { AppConfig } from '../config/configuration';

const MIME_PERMITIDOS = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'text/plain',
  'text/csv',
]);

export interface ArchivoGuardado {
  rutaRelativa: string;
  hashSha256: string;
  tamanoBytes: number;
}

@Injectable()
export class AlmacenamientoService {
  private readonly logger = new Logger(AlmacenamientoService.name);
  private readonly dir: string;
  readonly maxBytes: number;

  constructor(config: ConfigService) {
    this.dir = config.get<string>('archivosDir')!;
    this.maxBytes = config.get<number>('archivoMaxBytes')!;
  }

  validarTipo(mimeType: string): void {
    if (!MIME_PERMITIDOS.has(mimeType)) {
      throw new BadRequestException(
        'Tipo de archivo no permitido. Usa PDF, Word, Excel, PowerPoint, imagen o texto.',
      );
    }
  }

  async guardar(buffer: Buffer, nombreOriginal: string, mimeType: string): Promise<ArchivoGuardado> {
    this.validarTipo(mimeType);
    if (buffer.length > this.maxBytes) {
      throw new BadRequestException('El archivo supera el tamaño máximo permitido');
    }

    const ext = extname(nombreOriginal).toLowerCase().slice(0, 12);
    const sub = new Date().toISOString().slice(0, 7); // AAAA-MM
    const carpeta = join(this.dir, sub);
    await mkdir(carpeta, { recursive: true });

    const nombre = `${randomUUID()}${ext}`;
    await writeFile(join(carpeta, nombre), buffer);

    return {
      rutaRelativa: `${sub}/${nombre}`,
      hashSha256: createHash('sha256').update(buffer).digest('hex'),
      tamanoBytes: buffer.length,
    };
  }

  streamDe(rutaRelativa: string): Readable {
    const ruta = join(this.dir, rutaRelativa);
    if (!existsSync(ruta)) {
      throw new BadRequestException('El archivo ya no está disponible en el almacenamiento');
    }
    return createReadStream(ruta);
  }

  async eliminar(rutaRelativa: string): Promise<void> {
    try {
      await unlink(join(this.dir, rutaRelativa));
    } catch (e) {
      this.logger.warn(`No se pudo eliminar ${rutaRelativa}: ${(e as Error).message}`);
    }
  }
}
