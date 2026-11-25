import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ClasificacionHallazgo, FasePHVA, OrigenMCC, PrioridadHallazgo, TipoRegistroMCC } from '@prisma/client';
import { PaginacionQuery } from '../../common/dto/paginacion';

const ESTATUS = ['ABIERTO', 'EN_SEGUIMIENTO', 'CERRADO', 'DESESTIMADO', 'SIN_ESTADO'] as const;

export class ListarMCCQuery extends PaginacionQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsEnum(OrigenMCC) origen?: OrigenMCC;
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @Type(() => Boolean) mios?: boolean;
}

/** Filtros del tablero y de la tabla de Control ACyP (los mismos de la hoja original). */
export class FiltrosControlQuery {
  @IsOptional() @IsISO8601() desde?: string;
  @IsOptional() @IsISO8601() hasta?: string;
  @IsOptional() @IsString() macroproceso?: string;
  @IsOptional() @IsString() area?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12) mes?: number;
  @IsOptional() @IsEnum(TipoRegistroMCC) tipo?: TipoRegistroMCC;
}

export class ListarControlQuery extends FiltrosControlQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsIn(ESTATUS) estatus?: (typeof ESTATUS)[number];
  @IsOptional() @IsIn(['PENDIENTE', 'SEGUIMIENTO', 'COMPLETADA', 'VENCIDA', 'SIN_ACYP', 'VENCIDO', 'POR_VENCER']) situacion?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) porPagina = 50;
}

/** Campos del formulario de registro del Control MCC (secciones 1 a 4). Todos opcionales. */
export class CamposControlDto {
  @IsOptional() @IsEnum(TipoRegistroMCC) tipoRegistro?: TipoRegistroMCC | null;
  @IsOptional() @IsString() @MaxLength(60) codigoTipo?: string | null;
  @IsOptional() @IsString() @MaxLength(191) gestorCalidad?: string | null;
  @IsOptional() @IsISO8601() fechaRecepcion?: string | null;
  @IsOptional() @IsString() @MaxLength(191) usuarioEncuentra?: string | null;
  @IsOptional() @IsString() @MaxLength(191) areaReporta?: string | null;
  @IsOptional() @IsString() @MaxLength(191) fuente?: string | null;
  @IsOptional() @IsString() @MaxLength(191) fuenteSecundaria?: string | null;
  @IsOptional() @IsString() @MaxLength(191) numeroExpediente?: string | null;
  @IsOptional() @IsString() @MaxLength(30) turno?: string | null;

  @IsOptional() @IsString() @MaxLength(191) macroproceso?: string | null;
  @IsOptional() @IsString() @MaxLength(191) areaResponsable?: string | null;
  @IsOptional() @IsString() @MaxLength(191) procesoAfectado?: string | null;
  @IsOptional() @IsString() @MaxLength(191) subproceso?: string | null;
  @IsOptional() @IsString() @MaxLength(191) procedimiento?: string | null;
  @IsOptional() @IsString() @MaxLength(191) subrogado?: string | null;
  @IsOptional() @IsString() @MaxLength(60) impacto?: string | null;
  @IsOptional() @IsString() @MaxLength(191) dondeImpacto?: string | null;

  @IsOptional() @IsString() @MaxLength(4000) causaRaiz?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(5) @IsString({ each: true }) @MaxLength(1000, { each: true }) porques?: string[] | null;
  @IsOptional() @IsBoolean() requiereAcyp?: boolean;
  @IsOptional() @IsString() @MaxLength(60) acypCodigo?: string | null;
  @IsOptional() @IsInt() @Min(0) compromisosAdquiridos?: number | null;
  @IsOptional() @IsInt() @Min(0) compromisosCumplidos?: number | null;
  @IsOptional() @IsString() @MaxLength(191) escalamiento?: string | null;
  @IsOptional() @IsBoolean() tieneCostos?: boolean;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) costoCalidad?: number | null;
  @IsOptional() @IsEnum(FasePHVA) phva?: FasePHVA | null;
  @IsOptional() @IsString() @MaxLength(4000) logros?: string | null;
  @IsOptional() @IsString() @MaxLength(191) leanDefecto?: string | null;
  @IsOptional() @IsString() @MaxLength(191) leanRetrabajo?: string | null;
  @IsOptional() @IsString() @MaxLength(191) leanEspera?: string | null;
  @IsOptional() @IsString() @MaxLength(191) leanMovimiento?: string | null;

  @IsOptional() @IsString() @MaxLength(191) responsableNombre?: string | null;
  @IsOptional() @IsISO8601() fechaNotificacion?: string | null;
  @IsOptional() @IsISO8601() fechaCompromisoRespuesta?: string | null;
  @IsOptional() @IsISO8601() fechaLimite?: string | null;
  @IsOptional() @IsISO8601() fechaCierre?: string | null;
  @IsOptional() @IsString() @MaxLength(60) validacionCalidad?: string | null;
  @IsOptional() @IsString() @MaxLength(4000) notaEvidencia?: string | null;
  @IsOptional() @IsEnum(PrioridadHallazgo) prioridad?: PrioridadHallazgo | null;
  /** Estatus de cierre de la hoja; solo lo aplica quien gestiona MCC. */
  @IsOptional() @IsIn(ESTATUS) estatus?: (typeof ESTATUS)[number];
}

export class CrearMCCDto extends CamposControlDto {
  @IsString() @MinLength(3) @MaxLength(191) titulo!: string;
  @IsString() @MinLength(5) @MaxLength(4000) descripcion!: string;
  @IsEnum(OrigenMCC) origen!: OrigenMCC;
  @IsOptional() @IsString() @MaxLength(300) origenDetalle?: string;
  @IsOptional() @IsString() areaId?: string;
}

export class EditarMCCDto extends CamposControlDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(191) titulo?: string;
  @IsOptional() @IsString() @MinLength(5) @MaxLength(4000) descripcion?: string;
  @IsOptional() @IsString() areaId?: string | null;
}

/** Edición en línea desde la tabla de Control ACyP. */
export class EdicionRapidaMCCDto {
  @IsOptional() @IsIn(ESTATUS) estatus?: (typeof ESTATUS)[number];
  @IsOptional() @IsISO8601() fechaRecepcion?: string | null;
  @IsOptional() @IsISO8601() fechaLimite?: string | null;
  @IsOptional() @IsISO8601() fechaCierre?: string | null;
  @IsOptional() @IsString() @MaxLength(191) macroproceso?: string | null;
  @IsOptional() @IsString() @MaxLength(191) areaResponsable?: string | null;
  @IsOptional() @IsString() @MaxLength(191) responsableNombre?: string | null;
}

/** Escalar un registro del Control MCC a hallazgo formal (ciclo ISO completo). */
export class EscalarMCCDto {
  @IsEnum(ClasificacionHallazgo) clasificacion!: ClasificacionHallazgo;
  @IsOptional() @IsString() procesoId?: string;
  @IsOptional() @IsString() responsableId?: string;
  @IsOptional() @IsString() @MaxLength(200) requisito?: string;
  @IsOptional() @IsEnum(PrioridadHallazgo) prioridad?: PrioridadHallazgo;
}

export class ImportarMCCQuery {
  /** true = solo analiza el archivo y devuelve la vista previa, sin guardar. */
  @IsOptional() @IsIn(['true', 'false']) simular?: 'true' | 'false';
}

export class DecidirMCCDto {
  @IsBoolean() procede!: boolean;
  @IsString() @MinLength(3) @MaxLength(2000) justificacion!: string;
  @IsOptional() @IsString() @MaxLength(60) impacto?: string;
  @IsOptional() @IsEnum(PrioridadHallazgo) prioridad?: PrioridadHallazgo;
}

export class CerrarMCCDto {
  @IsString() @MinLength(3) @MaxLength(3000) evaluacionResultado!: string;
  @IsOptional() @IsString() @MaxLength(3000) aprendizaje?: string;
}

export class ComentarMCCDto {
  @IsString() @MinLength(1) @MaxLength(3000) texto!: string;
}
