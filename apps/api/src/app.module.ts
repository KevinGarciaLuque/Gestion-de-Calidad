import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { BitacoraModule } from './common/bitacora/bitacora.module';
import { AlmacenamientoModule } from './common/almacenamiento/almacenamiento.module';
import { CorreoModule } from './common/correo/correo.module';
import { EvidenciasModule } from './evidencias/evidencias.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { AutomatizacionesModule } from './automatizaciones/automatizaciones.module';
import { CalendarioModule } from './calendario/calendario.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportesModule } from './reportes/reportes.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { RolesModule } from './roles/roles.module';
import { OrganizacionModule } from './organizacion/organizacion.module';
import { ProcesosModule } from './procesos/procesos.module';
import { IndicadoresModule } from './indicadores/indicadores.module';
import { RiesgosModule } from './riesgos/riesgos.module';
import { DocumentosModule } from './documentos/documentos.module';
import { AuditoriasModule } from './auditorias/auditorias.module';
import { HallazgosModule } from './hallazgos/hallazgos.module';
import { AccionesModule } from './acciones/acciones.module';
import { MccModule } from './mcc/mcc.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    BitacoraModule,
    AlmacenamientoModule,
    CorreoModule,
    EvidenciasModule,
    NotificacionesModule,
    AuthModule,
    HealthModule,
    UsuariosModule,
    RolesModule,
    OrganizacionModule,
    ProcesosModule,
    IndicadoresModule,
    RiesgosModule,
    DocumentosModule,
    AuditoriasModule,
    HallazgosModule,
    AccionesModule,
    MccModule,
    AutomatizacionesModule,
    CalendarioModule,
    DashboardModule,
    ReportesModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
