import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Envío de correo. Si no hay SMTP configurado (variables SMTP_HOST…), no hace
 * nada más que registrar en el log — el sistema sigue funcionando con las
 * notificaciones internas.
 */
@Injectable()
export class CorreoService {
  private readonly logger = new Logger(CorreoService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    this.from = config.get<string>('SMTP_FROM') ?? 'Calidad 360 <no-reply@calidad360.local>';
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(config.get<string>('SMTP_PORT') ?? '587', 10),
        secure: config.get<string>('SMTP_SECURE') === 'true',
        auth: config.get<string>('SMTP_USER')
          ? { user: config.get<string>('SMTP_USER')!, pass: config.get<string>('SMTP_PASS') ?? '' }
          : undefined,
      });
      this.logger.log(`Correo habilitado vía ${host}`);
    } else {
      this.transporter = null;
      this.logger.log('Correo deshabilitado (sin SMTP_HOST). Solo notificaciones internas.');
    }
  }

  get habilitado(): boolean {
    return this.transporter !== null;
  }

  async enviar(to: string, asunto: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.debug(`[correo simulado] a=${to} asunto="${asunto}"`);
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to, subject: asunto, html });
    } catch (e) {
      this.logger.warn(`No se pudo enviar correo a ${to}: ${(e as Error).message}`);
    }
  }
}
