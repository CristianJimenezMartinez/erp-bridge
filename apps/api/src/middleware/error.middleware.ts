import { Request, Response, NextFunction } from 'express';
import { BridgeError } from '@erp-bridge/sdk';
import { Logger } from '@erp-bridge/shared';

const logger = new Logger('ErrorMiddleware');

export function errorHandler(
  err: Error | BridgeError | unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof BridgeError) {
    logger.warn(`BridgeError (${err.code}): ${err.message}`, {
      code: err.code,
      path: req.path,
      details: err.details,
    });

    const statusCode = err.code.includes('NOT_FOUND')
      ? 404
      : err.code.includes('AUTH')
      ? 401
      : err.code.includes('VALIDATION')
      ? 400
      : 500;

    res.status(statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        retryable: err.retryable,
      },
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Error interno del servidor';
  logger.error(`Error no controlado en ruta ${req.path}: ${message}`, err);

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message,
    },
  });
}
