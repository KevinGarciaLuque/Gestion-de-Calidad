import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';
import type { AppConfig } from '../../config/configuration';

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

/**
 * Guarda archivos en un bucket S3-compatible (AWS S3, Cloudflare R2, Backblaze
 * B2, MinIO) cuando hay credenciales configuradas; si no, cae a disco local.
 * La `rutaRelativa` que devuelve `guardar()` sirve como clave en ambos casos,
 * así que el resto del sistema (documentos, evidencias) no distingue backend.
 */
@Injectable()
export class AlmacenamientoService {
  private readonly logger = new Logger(AlmacenamientoService.name);
  private readonly dir: string;
  private readonly s3Config: AppConfig['s3'];
  private readonly s3Client: S3Client | null;
  readonly maxBytes: number;

  constructor(config: ConfigService) {
    this.dir = config.get<string>('archivosDir')!;
    this.maxBytes = config.get<number>('archivoMaxBytes')!;
    this.s3Config = config.get<AppConfig['s3']>('s3') ?? null;

    if (this.s3Config) {
      this.s3Client = new S3Client({
        region: this.s3Config.region,
        endpoint: this.s3Config.endpoint,
        forcePathStyle: this.s3Config.forcePathStyle,
        credentials: {
          accessKeyId: this.s3Config.accessKeyId,
          secretAccessKey: this.s3Config.secretAccessKey,
        },
      });
      this.logger.log(`Almacenamiento: bucket S3 "${this.s3Config.bucket}"`);
    } else {
      this.s3Client = null;
      this.logger.log(`Almacenamiento: disco local (${this.dir})`);
    }
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
    const nombre = `${randomUUID()}${ext}`;
    const rutaRelativa = `${sub}/${nombre}`;

    if (this.s3Client && this.s3Config) {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.s3Config.bucket,
          Key: rutaRelativa,
          Body: buffer,
          ContentType: mimeType,
        }),
      );
    } else {
      const carpeta = join(this.dir, sub);
      await mkdir(carpeta, { recursive: true });
      await writeFile(join(carpeta, nombre), buffer);
    }

    return {
      rutaRelativa,
      hashSha256: createHash('sha256').update(buffer).digest('hex'),
      tamanoBytes: buffer.length,
    };
  }

  async streamDe(rutaRelativa: string): Promise<Readable> {
    if (this.s3Client && this.s3Config) {
      try {
        const res = await this.s3Client.send(
          new GetObjectCommand({ Bucket: this.s3Config.bucket, Key: rutaRelativa }),
        );
        return res.Body as Readable;
      } catch (e) {
        if (e instanceof NoSuchKey) {
          throw new BadRequestException('El archivo ya no está disponible en el almacenamiento');
        }
        throw e;
      }
    }

    const ruta = join(this.dir, rutaRelativa);
    if (!existsSync(ruta)) {
      throw new BadRequestException('El archivo ya no está disponible en el almacenamiento');
    }
    return createReadStream(ruta);
  }

  async eliminar(rutaRelativa: string): Promise<void> {
    try {
      if (this.s3Client && this.s3Config) {
        await this.s3Client.send(
          new DeleteObjectCommand({ Bucket: this.s3Config.bucket, Key: rutaRelativa }),
        );
      } else {
        await unlink(join(this.dir, rutaRelativa));
      }
    } catch (e) {
      this.logger.warn(`No se pudo eliminar ${rutaRelativa}: ${(e as Error).message}`);
    }
  }
}
