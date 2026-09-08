import type { CookieOptions, Response } from 'express';

export interface RefreshCookieCfg {
  name: string;
  secure: boolean;
}

export function ponerRefreshCookie(
  res: Response,
  cfg: RefreshCookieCfg,
  token: string,
  maxAgeMs: number,
): void {
  res.cookie(cfg.name, token, opciones(cfg, maxAgeMs));
}

export function limpiarRefreshCookie(res: Response, cfg: RefreshCookieCfg): void {
  res.clearCookie(cfg.name, opciones(cfg, 0));
}

function opciones(cfg: RefreshCookieCfg, maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: cfg.secure,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: maxAgeMs,
  };
}
