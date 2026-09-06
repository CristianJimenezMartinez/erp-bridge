import { bootstrapApp } from './server';
import { Logger } from '@erp-bridge/shared';

const logger = new Logger('Bootstrap');
const PORT = Number(process.env['PORT']) || 3000;

bootstrapApp()
  .then((app) => {
    app.listen(PORT, () => {
      logger.info(`ERP Bridge API Server escuchando en http://localhost:${PORT}`);
      logger.info(`Health check disponible en http://localhost:${PORT}/health`);
      logger.info(`Rutas API disponibles en http://localhost:${PORT}/api/v1/...`);
    });
  })
  .catch((err) => {
    logger.error('Error fatal al arrancar ERP Bridge API', err);
    process.exit(1);
  });
