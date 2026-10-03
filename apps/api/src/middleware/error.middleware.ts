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

  // 1. Errores de validación de esquemas Zod
  if ((err as any)?.name === 'ZodError' || Array.isArray((err as any)?.issues)) {
    const issues = (err as any).issues || [];
    const issueMsg = issues.length > 0
      ? issues.map((i: any) => `${i.path.join('.') || 'body'}: ${i.message}`).join(', ')
      : 'Error de validación en los datos de la petición';

    logger.warn(`ValidationError (Zod) en ${req.path}: ${issueMsg}`, { path: req.path, issues });

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: issueMsg,
        issues,
      },
    });
    return;
  }

  // 2. Errores de sintaxis JSON en el cuerpo de la petición (express.json)
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    logger.warn(`Malformed JSON body en ${req.path}`, { path: req.path });
    res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'El cuerpo de la petición contiene un JSON no válido',
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
