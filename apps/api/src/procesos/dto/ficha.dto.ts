import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class EntradaFicha {
  @IsString() @MaxLength(200) proveedor!: string;
  @IsString() @MaxLength(300) insumo!: string;
  @IsOptional() @IsString() @MaxLength(500) requisitos?: string;
}

export class ActividadFicha {
  @IsInt() @Min(1) orden!: number;
  @IsString() @MaxLength(300) actividad!: string;
  @IsOptional() @IsString() @MaxLength(200) responsable?: string;
  @IsOptional() @IsString() @MaxLength(300) puntoControl?: string;
}

export class SalidaFicha {
  @IsString() @MaxLength(300) salida!: string;
  @IsOptional() @IsString() @MaxLength(300) registro?: string;
  @IsOptional() @IsString() @MaxLength(200) cliente?: string;
}

export enum TipoRecurso {
  PERSONAL = 'PERSONAL',
  TECNOLOGIA = 'TECNOLOGIA',
  INFRAESTRUCTURA = 'INFRAESTRUCTURA',
  EQUIPO = 'EQUIPO',
  INFORMACION = 'INFORMACION',
}

export class RecursoFicha {
  @IsEnum(TipoRecurso) tipo!: TipoRecurso;
  @IsString() @MaxLength(400) detalle!: string;
}

export class GuardarFichaDto {
  @IsString()
  @MaxLength(2000)
  alcance!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntradaFicha)
  entradas: EntradaFicha[] = [];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActividadFicha)
  actividades: ActividadFicha[] = [];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalidaFicha)
  salidas: SalidaFicha[] = [];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecursoFicha)
  recursos: RecursoFicha[] = [];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notas?: string;

  /** Definición Mermaid del flujograma. Vacío/nulo = se genera desde las actividades. */
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  flujograma?: string | null;
}
