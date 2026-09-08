import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { FrecuenciaIndicador, SentidoIndicador } from '@prisma/client';
import { PaginacionQuery } from '../../common/dto/paginacion';

export class ListarIndicadoresQuery extends PaginacionQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() procesoId?: string;
  @IsOptional() @IsEnum(FrecuenciaIndicador) frecuencia?: FrecuenciaIndicador;
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  soloConAlerta?: boolean;
}

export class CrearIndicadorDto {
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9-]{1,29}$/, { message: 'Código no válido (ej. IND-CAL-001)' })
  codigo!: string;

  @IsString() @MinLength(3) @MaxLength(200)
  nombre!: string;

  @IsString() @MinLength(3) @MaxLength(1000)
  objetivo!: string;

  @IsString()
  procesoId!: string;

  @IsString() @MinLength(2) @MaxLength(1000)
  formula!: string;

  @IsBoolean()
  usaNumeradorDenominador!: boolean;

  @IsBoolean()
  expresarPorcentaje!: boolean;

  @IsString() @MinLength(1) @MaxLength(40)
  unidad!: string;

  @IsOptional() @IsString() @MaxLength(1000)
  fuenteDatos?: string;

  @IsEnum(FrecuenciaIndicador)
  frecuencia!: FrecuenciaIndicador;

  @IsEnum(SentidoIndicador)
  sentido!: SentidoIndicador;

  @IsNumber()
  meta!: number;

  @IsOptional() @IsNumber()
  umbralAmarillo?: number | null;

  @IsOptional() @IsString()
  responsableCapturaId?: string | null;

  @IsOptional() @IsString()
  responsableAnalisisId?: string | null;
}

export class EditarIndicadorDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(200) nombre?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(1000) objetivo?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(1000) formula?: string;
  @IsOptional() @IsBoolean() usaNumeradorDenominador?: boolean;
  @IsOptional() @IsBoolean() expresarPorcentaje?: boolean;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(40) unidad?: string;
  @IsOptional() @IsString() @MaxLength(1000) fuenteDatos?: string | null;
  @IsOptional() @IsEnum(FrecuenciaIndicador) frecuencia?: FrecuenciaIndicador;
  @IsOptional() @IsEnum(SentidoIndicador) sentido?: SentidoIndicador;
  @IsOptional() @IsNumber() meta?: number;
  @IsOptional() @IsNumber() umbralAmarillo?: number | null;
  @IsOptional() @IsString() responsableCapturaId?: string | null;
  @IsOptional() @IsString() responsableAnalisisId?: string | null;
}

export class RegistrarMedicionDto {
  @IsInt() @Min(2000) @Max(2100)
  anio!: number;

  @IsInt() @Min(1) @Max(12)
  periodo!: number;

  @IsOptional() @IsNumber()
  numerador?: number | null;

  @IsOptional() @IsNumber()
  denominador?: number | null;

  @IsOptional() @IsNumber()
  valor?: number | null;

  @IsOptional() @IsString() @MaxLength(3000)
  analisis?: string;

  @IsOptional() @IsString() @MaxLength(3000)
  planAccion?: string;

  @IsOptional() @IsString() @MaxLength(500)
  evidenciaUrl?: string;
}

export class AnalizarMedicionDto {
  @IsString() @MinLength(3) @MaxLength(3000)
  analisis!: string;

  @IsOptional() @IsString() @MaxLength(3000)
  planAccion?: string;
}

export class ConsolidadoQuery {
  @IsInt() @Type(() => Number) @Min(2000) @Max(2100)
  anio!: number;

  @IsOptional() @IsString() procesoId?: string;
}
