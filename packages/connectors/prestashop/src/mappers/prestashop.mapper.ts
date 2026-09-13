import { PrestaShopProductMapper } from './product.mapper';
import { PrestaShopOrderMapper } from './order.mapper';
import { PrestaShopCustomerMapper } from './customer.mapper';
import { PrestaShopStockMapper } from './stock.mapper';

export class PrestaShopMapper {
  public static product = PrestaShopProductMapper;
  public static order = PrestaShopOrderMapper;
  public static customer = PrestaShopCustomerMapper;
  public static stock = PrestaShopStockMapper;
}

export * from './product.mapper';
export * from './order.mapper';
export * from './customer.mapper';
export * from './stock.mapper';
