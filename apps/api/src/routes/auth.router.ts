/**
 * @file auth.router.ts
 * @description Facade barrel para compatibilidad hacia atrás del módulo de autenticación.
 * La implementación modular reside en `./auth/`.
 */

export * from './auth';
export { authRouter as default } from './auth';
