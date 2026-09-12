export interface SyncHistoryRecord {
  id: string;
  timestamp: string;
  type: 'manual' | 'realtime' | 'periodic';
  mode: 'full' | 'stock' | 'orders';
  status: 'success' | 'warning' | 'error';
  durationSeconds: number;
  itemsUpdated: number;
  ordersImported: number;
  message: string;
}
