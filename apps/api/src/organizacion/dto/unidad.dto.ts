import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { TipoUnidad } from '@prisma/client';

export class CrearUnidadDto {
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9-]{1,29}$/, { message: 'Código no válido' })
  codigo!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre!: string;

  @IsEnum(TipoUnidad)
  tipo!: TipoUnidad;

  @IsOptional()
  @IsString()
  padreId?: string;

  @IsOptional()
  @IsString()
  responsableId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}

export class EditarUnidadDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsEnum(TipoUnidad)
  tipo?: TipoUnidad;

  @IsOptional()
  @IsString()
  padreId?: string | null;

  @IsOptional()
  @IsString()
  responsableId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}
