import dotenv from 'dotenv';
import { LocalAgent } from './agent';

dotenv.config();

const agent = new LocalAgent({
  agentName: process.env['AGENT_NAME'] || 'Local Windows Agent',
  apiBaseUrl: process.env['API_BASE_URL'] || 'http://localhost:3000',
  organizationId: process.env['ORGANIZATION_ID'] || 'org_default',
  factusolDbPath: process.env['FACTUSOL_DB_PATH'] || 'D:\\Proyectos\\Bentian\\API\\asd\\0022025.accdb',
  heartbeatIntervalMs: 30000,
});

agent.start().catch((err) => {
  console.error('Error fatal al iniciar Local Agent:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  await agent.stop();
  process.exit(0);
});
