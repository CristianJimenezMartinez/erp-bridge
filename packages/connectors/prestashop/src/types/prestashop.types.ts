export interface PrestaShopConfig {
  url: string;
  apiKey: string;
  defaultLangId?: number;
  timeoutMs?: number;
  reGroupIds?: number[];
  acceleratorPath?: string;
}

export interface PrestaShopLanguageValue {
  language: Array<{ '@_id': string; '#text': string }> | { '@_id': string; '#text': string };
}

export interface PrestaShopProduct {
  id: number | string;
  id_default_image?: number | string;
  id_category_default?: number | string;
  reference?: string;
  name?: string | PrestaShopLanguageValue;
  description?: string | PrestaShopLanguageValue;
  description_short?: string | PrestaShopLanguageValue;
  price?: string | number;
  wholesale_price?: string | number;
  active?: string | number;
  weight?: string | number;
  ean13?: string;
  associations?: {
    categories?: Array<{ id: string | number }>;
    combinations?: Array<{ id: string | number }>;
    stock_availables?: Array<{ id: string | number; id_product_attribute: string | number }>;
  };
}

export interface PrestaShopCombination {
  id: number | string;
  id_product: number | string;
  reference?: string;
  ean13?: string;
  price?: string | number;
  wholesale_price?: string | number;
  weight?: string | number;
  associations?: {
    product_option_values?: Array<{ id: string | number }>;
  };
}

export interface PrestaShopStockAvailable {
  id: number | string;
  id_product: number | string;
  id_product_attribute: number | string;
  id_shop?: number | string;
  id_shop_group?: number | string;
  quantity: number | string;
  depends_on_stock?: number | string;
  out_of_stock?: number | string;
}

export interface PrestaShopOrderRow {
  id?: number | string;
  product_id: number | string;
  product_attribute_id?: number | string;
  product_quantity: number | string;
  product_name: string;
  product_reference?: string;
  product_price: number | string;
  unit_price_tax_incl?: number | string;
  unit_price_tax_excl?: number | string;
  total_price_tax_incl?: number | string;
  total_price_tax_excl?: number | string;
}

export interface PrestaShopOrder {
  id: number | string;
  reference?: string;
  id_customer: number | string;
  id_address_delivery?: number | string;
  id_address_invoice?: number | string;
  current_state: number | string;
  payment?: string;
  module?: string;
  total_paid?: number | string;
  total_paid_tax_incl?: number | string;
  total_paid_tax_excl?: number | string;
  total_products?: number | string;
  total_products_wt?: number | string;
  total_shipping?: number | string;
  total_shipping_tax_incl?: number | string;
  total_shipping_tax_excl?: number | string;
  total_discounts?: number | string;
  date_add: string;
  date_upd?: string;
  associations?: {
    order_rows?: PrestaShopOrderRow[];
  };
}

export interface PrestaShopCustomer {
  id: number | string;
  firstname: string;
  lastname: string;
  email: string;
  company?: string;
  siret?: string;
  ape?: string;
  id_default_group?: number | string;
  active?: string | number;
  date_add?: string;
  associations?: {
    groups?: Array<{ id: string | number }>;
  };
}

export interface PrestaShopAddress {
  id: number | string;
  id_customer?: number | string;
  alias?: string;
  company?: string;
  lastname?: string;
  firstname?: string;
  address1?: string;
  address2?: string;
  postcode?: string;
  city?: string;
  id_country?: number | string;
  id_state?: number | string;
  phone?: string;
  phone_mobile?: string;
  dni?: string;
  vat_number?: string;
}

export interface PrestaShopOrderCarrier {
  id: number | string;
  id_order: number | string;
  id_carrier?: number | string;
  tracking_number?: string;
  weight?: number | string;
  shipping_cost_tax_excl?: number | string;
}
