import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  CategoriaRiesgo,
  EficaciaControl,
  EstadoRiesgo,
  TipoRiesgo,
} from '@prisma/client';
import { PaginacionQuery } from '../../common/dto/paginacion';

export class ListarRiesgosQuery extends PaginacionQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() procesoId?: string;
  @IsOptional() @IsEnum(TipoRiesgo) tipo?: TipoRiesgo;
  @IsOptional() @IsEnum(CategoriaRiesgo) categoria?: CategoriaRiesgo;
  @IsOptional() @IsEnum(EstadoRiesgo) estado?: EstadoRiesgo;
  @IsOptional()
  @Type(() => Boolean)
  soloConAlerta?: boolean;
}

export class CrearRiesgoDto {
  @IsString()
  @MaxLength(30)
  codigo!: string;

  @IsEnum(TipoRiesgo)
  tipo!: TipoRiesgo;

  @IsString()
  procesoId!: string;

  @IsString() @MinLength(5) @MaxLength(1000)
  descripcion!: string;

  @IsOptional() @IsString() @MaxLength(1000) causa?: string;
  @IsOptional() @IsString() @MaxLength(1000) consecuencia?: string;

  @IsInt() @Min(1) @Max(10)
  probabilidadInherente!: number;

  @IsInt() @Min(1) @Max(10)
  impactoInherente!: number;
}

export class EditarRiesgoDto {
  @IsOptional() @IsString() @MinLength(5) @MaxLength(1000) descripcion?: string;
  @IsOptional() @IsString() @MaxLength(1000) causa?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) consecuencia?: string | null;
  @IsOptional() @IsInt() @Min(1) @Max(10) probabilidadInherente?: number;
  @IsOptional() @IsInt() @Min(1) @Max(10) impactoInherente?: number;
  @IsOptional() @IsString() @MaxLength(2000) controles?: string | null;
  @IsOptional() @IsEnum(EficaciaControl) eficaciaControl?: EficaciaControl;
  @IsOptional() @IsString() @MaxLength(2000) planTratamiento?: string | null;
  @IsOptional() @IsString() responsableId?: string | null;
  @IsOptional() @IsISO8601() fechaCompromiso?: string | null;
  @IsOptional() @IsEnum(EstadoRiesgo) estado?: EstadoRiesgo;
}

export class ReevaluarRiesgoDto {
  @IsInt() @Min(1) @Max(10)
  probabilidadResidual!: number;

  @IsInt() @Min(1) @Max(10)
  impactoResidual!: number;

  @IsOptional() @IsString() @MaxLength(1500)
  comentario?: string;

  @IsOptional() @IsInt() @Min(1) @Max(60)
  mesesProximaRevision?: number;
}

export class RevisarRiesgoDto {
  @IsOptional() @IsString() @MaxLength(1500)
  comentario?: string;

  @IsOptional() @IsInt() @Min(1) @Max(60)
  mesesProximaRevision?: number;
}

export class CerrarRiesgoDto {
  @IsString() @MinLength(3) @MaxLength(1500)
  comentario!: string;
}

class NivelEscalaDto {
  @IsInt() @Min(1) @Max(10) valor!: number;
  @IsString() @MinLength(1) @MaxLength(60) etiqueta!: string;
  @IsOptional() @IsString() @MaxLength(300) descripcion?: string;
}

export class ConfigurarMatrizDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => NivelEscalaDto)
  escalaProbabilidad!: NivelEscalaDto[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => NivelEscalaDto)
  escalaImpacto!: NivelEscalaDto[];

  @IsInt() @Min(2) umbralMedio!: number;
  @IsInt() @Min(3) umbralAlto!: number;
  @IsInt() @Min(4) umbralCritico!: number;
  @IsInt() @Min(1) @Max(60) mesesRevisionDefault!: number;
}
