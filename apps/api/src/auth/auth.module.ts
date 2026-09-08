import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermisosGuard } from './guards/permisos.guard';
import { JwtStrategy } from './jwt.strategy';
import { AlcanceService } from './rbac/alcance.service';
import { TokensService } from './tokens.service';
import { UsuarioContextoService } from './usuario-contexto.service';

@Global()
@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokensService,
    UsuarioContextoService,
    AlcanceService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermisosGuard },
  ],
  exports: [UsuarioContextoService, AlcanceService],
})
export class AuthModule {}
