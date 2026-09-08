import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { TipoDocumento } from '@prisma/client';
import { PaginacionQuery } from '../../common/dto/paginacion';

export class ListarDocumentosQuery extends PaginacionQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsEnum(TipoDocumento) tipo?: TipoDocumento;
  @IsOptional() @IsString() procesoId?: string;
  @IsOptional() @IsString() areaId?: string;
  @IsOptional() @IsString() estado?: 'VIGENTE' | 'BORRADOR' | 'EN_REVISION' | 'SIN_VIGENTE' | 'ARCHIVADO';
  @IsOptional()
  @Type(() => Boolean)
  soloConAlerta?: boolean;
}

export class CrearDocumentoDto {
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9-./]{1,39}$/, { message: 'Código no válido (ej. PR-CAL-001)' })
  codigo!: string;

  @IsString() @MinLength(3) @MaxLength(200)
  nombre!: string;

  @IsEnum(TipoDocumento)
  tipo!: TipoDocumento;

  @IsOptional() @IsString() procesoId?: string;
  @IsOptional() @IsString() areaId?: string;
  @IsOptional() @IsString() propietarioId?: string;
  @IsOptional() @IsString() @MaxLength(500) palabrasClave?: string;
}

export class EditarDocumentoDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(200) nombre?: string;
  @IsOptional() @IsEnum(TipoDocumento) tipo?: TipoDocumento;
  @IsOptional() @IsString() procesoId?: string | null;
  @IsOptional() @IsString() areaId?: string | null;
  @IsOptional() @IsString() propietarioId?: string | null;
  @IsOptional() restringido?: boolean;
  @IsOptional() @IsString() @MaxLength(500) palabrasClave?: string | null;
}

export class GuardarVersionDto {
  @IsOptional() @IsString() @MaxLength(1000)
  motivoCambio?: string;

  @IsOptional() @IsISO8601()
  fechaEmision?: string;

  @IsOptional() @IsInt() @Min(1)
  mesesProximaRevision?: number;

  @IsOptional() @IsString() revisorId?: string | null;
  @IsOptional() @IsString() aprobadorId?: string | null;
}

export class RevisionDocumentoDto {
  @IsOptional() @IsString() @MaxLength(1000) comentario?: string;
}
