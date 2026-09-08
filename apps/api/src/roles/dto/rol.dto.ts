import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CrearRolDto {
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]{2,39}$/, {
    message: 'El código debe ser MAYÚSCULAS, números y guion bajo (ej. RESP_FARMACIA)',
  })
  codigo!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(80)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}

export class EditarRolDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class FijarPermisosDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permisos!: string[];
}
