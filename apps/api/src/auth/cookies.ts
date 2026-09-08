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
    // En producción la SPA y la API suelen vivir en dominios distintos: la
    // cookie del refresh viaja cross-site y necesita SameSite=None (+Secure).
    // En local (secure=false) se mantiene Lax.
    sameSite: cfg.secure ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: maxAgeMs,
  };
}
