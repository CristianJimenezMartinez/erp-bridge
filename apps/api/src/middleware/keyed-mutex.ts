/**
 * Exclusión mutua por clave dentro del proceso.
 *
 * Serializa operaciones sobre un mismo recurso (p. ej. activaciones de una misma licencia) para que
 * el patrón "contar activaciones → insertar" no pueda superar `maxActivations` con peticiones
 * simultáneas. La API de producción corre en una única instancia, por lo que un cerrojo en memoria
 * es suficiente; es una capa externa que evita tocar el módulo sellado de licencias.
 */
const tails = new Map<string, Promise<unknown>>();

export async function withKeyedLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = tails.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  const tail = previous.then(() => current);
  tails.set(key, tail);
  try {
    await previous.catch(() => undefined);
    return await fn();
  } finally {
    release();
    if (tails.get(key) === tail) {
      tails.delete(key);
    }
  }
}
