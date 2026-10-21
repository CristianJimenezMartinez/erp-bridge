import { ConfigManager } from '../../config/config.manager';
import { EventBus } from '../../diagnostics/event-bus';
import { SqlServerBaseAdapter } from '../sql-server-base.adapter';
import { SQL_SERVER_PROFILES } from '../sql-server-profiles';

export class AgoraErpAdapter extends SqlServerBaseAdapter {
  constructor(configManager: ConfigManager, eventBus?: EventBus) {
    super(SQL_SERVER_PROFILES.agora, configManager, eventBus);
  }
}

export class Sage50ErpAdapter extends SqlServerBaseAdapter {
  constructor(configManager: ConfigManager, eventBus?: EventBus) {
    super(SQL_SERVER_PROFILES.sage50, configManager, eventBus);
  }
}

export class A3ErpAdapter extends SqlServerBaseAdapter {
  constructor(configManager: ConfigManager, eventBus?: EventBus) {
    super(SQL_SERVER_PROFILES.a3erp, configManager, eventBus);
  }
}
