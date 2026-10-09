<?php
/**
 * Plugin Name:       Bentian ERP Bridge for Factusol
 * Plugin URI:        https://bridge.cristianjm.com
 * Description:       Conector oficial y de alto rendimiento para sincronizar Factusol (DELSOL) con tu tienda online. Sincronización bidireccional de catálogo, variantes, precios con IVA, stock y pedidos.
 * Version:           0.3.8
 * Author:            Cristian Jiménez Martínez (Bentian)
 * Author URI:        https://cristianjm.com
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       bentian-erp-bridge-for-factusol
 * Domain Path:       /languages
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * WC requires at least: 5.0
 * WC tested up to:   9.3
 */

defined( 'ABSPATH' ) || exit;

define( 'BENTIAN_BRIDGE_VERSION', '0.3.8' );
define( 'BENTIAN_BRIDGE_FILE', __FILE__ );
define( 'BENTIAN_BRIDGE_PATH', plugin_dir_path( __FILE__ ) );
define( 'BENTIAN_BRIDGE_URL', plugin_dir_url( __FILE__ ) );
define( 'BENTIAN_AGENT_DOWNLOAD_URL', 'https://bridge.cristianjm.com/releases/latest/Bentian-Setup.exe' );
define( 'BENTIAN_DOCS_URL', 'https://bridge.cristianjm.com/docs/' );

/**
 * 1. Declaración de compatibilidad con HPOS (High-Performance Order Storage de WooCommerce)
 */
add_action( 'before_woocommerce_init', function() {
    if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
    }
} );

/**
 * 2. Comprobación de dependencias al activar
 */
register_activation_hook( __FILE__, 'bentian_bridge_activate' );
function bentian_bridge_activate() {
    if ( ! class_exists( 'WooCommerce' ) ) {
        deactivate_plugins( plugin_basename( __FILE__ ) );
        wp_die(
            esc_html__( 'Bentian ERP Bridge requiere WooCommerce activo para funcionar. Por favor, instala y activa WooCommerce primero.', 'bentian-erp-bridge-for-factusol' ),
            'Plugin Activation Error',
            array( 'back_link' => true )
        );
    }

    // Configuración por defecto
    if ( ! get_option( 'bentian_bridge_settings' ) ) {
        update_option( 'bentian_bridge_settings', array(
            'installed_at'       => current_time( 'mysql' ),
            'auto_stock_sync'    => 1,
            'realtime_orders'    => 1,
            'webhook_secret'     => wp_generate_password( 32, false ),
            'diagnostic_status'  => 'ready',
        ) );
    }
}

/**
 * 3. Inicialización del plugin y carga de traducciones
 */
add_action( 'plugins_loaded', 'bentian_bridge_init' );
function bentian_bridge_init() {
    load_plugin_textdomain( 'bentian-erp-bridge-for-factusol', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );

    // Si WooCommerce no está activo, mostrar aviso en el admin
    if ( ! class_exists( 'WooCommerce' ) ) {
        add_action( 'admin_notices', function() {
            ?>
            <div class="notice notice-error">
                <p><?php esc_html_e( 'Bentian ERP Bridge requiere que WooCommerce esté instalado y activo.', 'bentian-erp-bridge-for-factusol' ); ?></p>
            </div>
            <?php
        } );
        return;
    }

    // Cargar clases
    require_once BENTIAN_BRIDGE_PATH . 'includes/class-bentian-rest-api.php';
    require_once BENTIAN_BRIDGE_PATH . 'includes/class-bentian-admin.php';

    // Instanciar REST API
    Bentian_Bridge_REST_API::get_instance();

    // Instanciar interfaz de administración
    if ( is_admin() ) {
        Bentian_Bridge_Admin::get_instance();
    }
}

/**
 * 4. Enlaces de acción en la lista de plugins
 */
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), 'bentian_bridge_action_links' );
function bentian_bridge_action_links( $links ) {
    $settings_link = '<a href="' . esc_url( admin_url( 'admin.php?page=bentian-factusol-bridge' ) ) . '">' . esc_html__( 'Ajustes y Conexión', 'bentian-erp-bridge-for-factusol' ) . '</a>';
    $agent_link    = '<a href="' . esc_url( BENTIAN_AGENT_DOWNLOAD_URL ) . '" style="color: #6366f1; font-weight: bold;" target="_blank">' . esc_html__( 'Descargar Agente Windows', 'bentian-erp-bridge-for-factusol' ) . '</a>';
    array_unshift( $links, $settings_link, $agent_link );
    return $links;
}
