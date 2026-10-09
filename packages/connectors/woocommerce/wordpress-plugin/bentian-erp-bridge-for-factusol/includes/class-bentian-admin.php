<?php
/**
 * Panel de Administración y Diagnóstico de Bentian ERP Bridge
 */

defined( 'ABSPATH' ) || exit;

class Bentian_Bridge_Admin {

    private static $instance = null;

    public static function get_instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action( 'admin_menu', array( $this, 'add_admin_menu' ) );
        add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_assets' ) );
        add_action( 'wp_ajax_bentian_generate_keys', array( $this, 'ajax_generate_keys' ) );
        add_action( 'wp_ajax_bentian_save_settings', array( $this, 'ajax_save_settings' ) );
    }

    public function add_admin_menu() {
        add_submenu_page(
            'woocommerce',
            __( 'Bentian Factusol Bridge', 'bentian-erp-bridge-for-factusol' ),
            __( 'Factusol Bridge ⚡', 'bentian-erp-bridge-for-factusol' ),
            'manage_woocommerce',
            'bentian-erp-bridge-for-factusol',
            array( $this, 'render_admin_page' )
        );
    }

    public function enqueue_admin_assets( $hook ) {
        if ( false === strpos( $hook, 'bentian-erp-bridge-for-factusol' ) ) {
            return;
        }

        wp_enqueue_style(
            'bentian-admin-style',
            BENTIAN_BRIDGE_URL . 'assets/css/bentian-admin.css',
            array(),
            BENTIAN_BRIDGE_VERSION
        );

        wp_enqueue_script(
            'bentian-admin-script',
            BENTIAN_BRIDGE_URL . 'assets/js/bentian-admin.js',
            array( 'jquery' ),
            BENTIAN_BRIDGE_VERSION,
            true
        );

        wp_localize_script( 'bentian-admin-script', 'bentianBridgeData', array(
            'ajaxUrl'   => admin_url( 'admin-ajax.php' ),
            'nonce'     => wp_create_nonce( 'bentian_bridge_admin_nonce' ),
            'siteUrl'   => get_site_url(),
            'restPing'  => rest_url( 'bentian/v1/ping' ),
        ) );
    }

    /**
     * AJAX: Generación automática de credenciales REST con un click
     */
    public function ajax_generate_keys() {
        check_ajax_referer( 'bentian_bridge_admin_nonce', 'nonce' );

        if ( ! current_user_can( 'manage_woocommerce' ) ) {
            wp_send_json_error( array( 'message' => __( 'Permisos insuficientes.', 'bentian-erp-bridge-for-factusol' ) ) );
        }

        global $wpdb;
        $user_id         = get_current_user_id();
        $consumer_key    = 'ck_' . wc_rand_hash();
        $consumer_secret = 'cs_' . wc_rand_hash();

        $inserted = $wpdb->insert(
            $wpdb->prefix . 'woocommerce_api_keys',
            array(
                'user_id'         => $user_id,
                'description'     => 'Bentian ERP Bridge (Agente Factusol)',
                'permissions'     => 'read_write',
                'consumer_key'    => wc_api_hash( $consumer_key ),
                'consumer_secret' => $consumer_secret,
                'truncated_key'   => substr( $consumer_key, -7 ),
                'last_access'     => null,
            ),
            array( '%d', '%s', '%s', '%s', '%s', '%s', '%s' )
        );

        if ( ! $inserted ) {
            wp_send_json_error( array( 'message' => __( 'Error al escribir las credenciales en la base de datos de WooCommerce.', 'bentian-erp-bridge-for-factusol' ) ) );
        }

        update_option( 'bentian_last_credentials', array(
            'consumer_key'    => $consumer_key,
            'consumer_secret' => $consumer_secret,
            'created_at'      => current_time( 'mysql' ),
        ) );

        wp_send_json_success( array(
            'consumer_key'    => $consumer_key,
            'consumer_secret' => $consumer_secret,
            'site_url'        => get_site_url(),
            'message'         => __( '¡Claves de acceso generadas correctamente!', 'bentian-erp-bridge-for-factusol' ),
        ) );
    }

    /**
     * AJAX: Guardar ajustes
     */
    public function ajax_save_settings() {
        check_ajax_referer( 'bentian_bridge_admin_nonce', 'nonce' );

        if ( ! current_user_can( 'manage_woocommerce' ) ) {
            wp_send_json_error( array( 'message' => __( 'Permisos insuficientes.', 'bentian-erp-bridge-for-factusol' ) ) );
        }

        $auto_stock    = isset( $_POST['auto_stock_sync'] ) ? 1 : 0;
        $realtime_ord  = isset( $_POST['realtime_orders'] ) ? 1 : 0;

        $settings = get_option( 'bentian_bridge_settings', array() );
        $settings['auto_stock_sync'] = $auto_stock;
        $settings['realtime_orders'] = $realtime_ord;

        update_option( 'bentian_bridge_settings', $settings );

        wp_send_json_success( array( 'message' => __( 'Ajustes guardados.', 'bentian-erp-bridge-for-factusol' ) ) );
    }

    /**
     * Renderizado del Dashboard de Administración
     */
    public function render_admin_page() {
        $settings         = get_option( 'bentian_bridge_settings', array() );
        $last_credentials = get_option( 'bentian_last_credentials', array() );

        // Diagnósticos del sistema
        $ssl_ok        = is_ssl();
        $permalinks_ok = ( '' !== get_option( 'permalink_structure' ) );
        $hpos_ok       = false;
        if ( class_exists( '\Automattic\WooCommerce\Utilities\OrderUtil' ) ) {
            $hpos_ok = \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled();
        }

        $all_green = $ssl_ok && $permalinks_ok;
        ?>
        <div class="wrap bentian-dashboard-wrap">
            <!-- Header Principal -->
            <div class="bentian-header">
                <div class="bentian-brand">
                    <div class="bentian-logo-icon">⚡</div>
                    <div>
                        <h1>Bentian ERP Bridge <span class="bentian-version-tag">v<?php echo esc_html( BENTIAN_BRIDGE_VERSION ); ?></span></h1>
                        <p class="bentian-subtitle"><?php esc_html_e( 'Conector oficial y de alto rendimiento entre Factusol (DELSOL) y WooCommerce', 'bentian-erp-bridge-for-factusol' ); ?></p>
                    </div>
                </div>
                <div class="bentian-header-actions">
                    <a href="<?php echo esc_url( BENTIAN_AGENT_DOWNLOAD_URL ); ?>" class="button button-primary bentian-btn-glow" target="_blank">
                        <?php esc_html_e( '📥 Descargar Agente Windows (.exe)', 'bentian-erp-bridge-for-factusol' ); ?>
                    </a>
                    <a href="<?php echo esc_url( BENTIAN_DOCS_URL ); ?>" class="button" target="_blank">
                        <?php esc_html_e( 'Documentación', 'bentian-erp-bridge-for-factusol' ); ?>
                    </a>
                </div>
            </div>

            <!-- Panel de Diagnóstico Pre-Vuelo -->
            <div class="bentian-card bentian-diagnostic-card">
                <h2><?php esc_html_e( '1. Diagnóstico de Compatibilidad de la Tienda', 'bentian-erp-bridge-for-factusol' ); ?></h2>
                <p><?php esc_html_e( 'Bentian Agent requiere que WooCommerce cuente con HTTPS y enlaces permanentes activos para la sincronización nativa de artículos y stock.', 'bentian-erp-bridge-for-factusol' ); ?></p>
                
                <div class="bentian-grid-diagnostics">
                    <div class="bentian-diag-item <?php echo $ssl_ok ? 'is-ok' : 'is-warning'; ?>">
                        <span class="bentian-diag-icon"><?php echo $ssl_ok ? '✅' : '⚠️'; ?></span>
                        <div>
                            <strong><?php esc_html_e( 'Conexión Segura HTTPS / SSL', 'bentian-erp-bridge-for-factusol' ); ?></strong>
                            <p><?php echo $ssl_ok ? esc_html__( 'Activo y seguro.', 'bentian-erp-bridge-for-factusol' ) : esc_html__( 'Recomendado activar SSL para proteger las credenciales.', 'bentian-erp-bridge-for-factusol' ); ?></p>
                        </div>
                    </div>

                    <div class="bentian-diag-item <?php echo $permalinks_ok ? 'is-ok' : 'is-error'; ?>">
                        <span class="bentian-diag-icon"><?php echo $permalinks_ok ? '✅' : '❌'; ?></span>
                        <div>
                            <strong><?php esc_html_e( 'Enlaces Permanentes (Permalinks)', 'bentian-erp-bridge-for-factusol' ); ?></strong>
                            <p><?php echo $permalinks_ok ? esc_html__( 'Configurados correctamente para la REST API.', 'bentian-erp-bridge-for-factusol' ) : esc_html__( 'Error: Debes elegir una estructura distinta de "Simple" en Ajustes > Enlaces permanentes.', 'bentian-erp-bridge-for-factusol' ); ?></p>
                        </div>
                    </div>

                    <div class="bentian-diag-item is-ok">
                        <span class="bentian-diag-icon">✅</span>
                        <div>
                            <strong><?php esc_html_e( 'Almacenamiento HPOS (WooCommerce 8+)', 'bentian-erp-bridge-for-factusol' ); ?></strong>
                            <p><?php echo $hpos_ok ? esc_html__( 'Tablas personalizadas HPOS activas.', 'bentian-erp-bridge-for-factusol' ) : esc_html__( 'Compatible (Modo estándar / HPOS compatible).', 'bentian-erp-bridge-for-factusol' ); ?></p>
                        </div>
                    </div>

                    <div class="bentian-diag-item is-ok" id="bentian-rest-ping-item">
                        <span class="bentian-diag-icon" id="bentian-rest-ping-icon">⚡</span>
                        <div>
                            <strong><?php esc_html_e( 'Latencia REST API Puente', 'bentian-erp-bridge-for-factusol' ); ?></strong>
                            <p id="bentian-rest-ping-status"><?php esc_html_e( 'Comprobando respuesta...', 'bentian-erp-bridge-for-factusol' ); ?></p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Panel de Generación de Credenciales -->
            <div class="bentian-card">
                <h2><?php esc_html_e( '2. Credenciales para Bentian Agent (Escritorio)', 'bentian-erp-bridge-for-factusol' ); ?></h2>
                <p><?php esc_html_e( 'No necesitas bucear en los ajustes avanzados de WooCommerce. Pulsa el siguiente botón para generar las claves de conexión de lectura y escritura para el agente de Factusol:', 'bentian-erp-bridge-for-factusol' ); ?></p>

                <div class="bentian-action-box">
                    <button type="button" id="bentian-btn-gen-keys" class="button button-primary button-hero">
                        <?php esc_html_e( '🔑 Generar Claves para Bentian Agent (1-Click)', 'bentian-erp-bridge-for-factusol' ); ?>
                    </button>
                    <span class="spinner" id="bentian-gen-spinner"></span>
                </div>

                <div id="bentian-credentials-display" style="<?php echo empty( $last_credentials ) ? 'display: none;' : ''; ?>">
                    <div class="bentian-credentials-grid">
                        <div class="bentian-field">
                            <label><?php esc_html_e( 'URL de la Tienda (Site URL):', 'bentian-erp-bridge-for-factusol' ); ?></label>
                            <div class="bentian-copy-group">
                                <input type="text" id="bentian-input-url" class="regular-text" readonly value="<?php echo esc_url( get_site_url() ); ?>" />
                                <button type="button" class="button bentian-copy-btn" data-target="bentian-input-url"><?php esc_html_e( 'Copiar', 'bentian-erp-bridge-for-factusol' ); ?></button>
                            </div>
                        </div>

                        <div class="bentian-field">
                            <label><?php esc_html_e( 'Clave de Cliente (Consumer Key):', 'bentian-erp-bridge-for-factusol' ); ?></label>
                            <div class="bentian-copy-group">
                                <input type="text" id="bentian-input-ck" class="regular-text" readonly value="<?php echo esc_attr( isset( $last_credentials['consumer_key'] ) ? $last_credentials['consumer_key'] : '' ); ?>" />
                                <button type="button" class="button bentian-copy-btn" data-target="bentian-input-ck"><?php esc_html_e( 'Copiar', 'bentian-erp-bridge-for-factusol' ); ?></button>
                            </div>
                        </div>

                        <div class="bentian-field">
                            <label><?php esc_html_e( 'Clave Secreta (Consumer Secret):', 'bentian-erp-bridge-for-factusol' ); ?></label>
                            <div class="bentian-copy-group">
                                <input type="password" id="bentian-input-cs" class="regular-text" readonly value="<?php echo esc_attr( isset( $last_credentials['consumer_secret'] ) ? $last_credentials['consumer_secret'] : '' ); ?>" />
                                <button type="button" class="button" id="bentian-toggle-secret"><?php esc_html_e( 'Ver', 'bentian-erp-bridge-for-factusol' ); ?></button>
                                <button type="button" class="button bentian-copy-btn" data-target="bentian-input-cs"><?php esc_html_e( 'Copiar', 'bentian-erp-bridge-for-factusol' ); ?></button>
                            </div>
                        </div>
                    </div>
                    <div class="bentian-notice-info">
                        💡 <strong><?php esc_html_e( 'Paso siguiente:', 'bentian-erp-bridge-for-factusol' ); ?></strong> <?php esc_html_e( 'Abre Bentian Agent en el PC de Factusol, ve a la pestaña "WooCommerce" y pega estas tres líneas. La conexión se validará de inmediato.', 'bentian-erp-bridge-for-factusol' ); ?>
                    </div>
                </div>
            </div>

            <!-- Panel de Flujo de Trabajo y Arquitectura -->
            <div class="bentian-card">
                <h2><?php esc_html_e( '3. ¿Cómo funciona la arquitectura Factusol ↔ WooCommerce?', 'bentian-erp-bridge-for-factusol' ); ?></h2>
                <div class="bentian-steps-container">
                    <div class="bentian-step">
                        <div class="bentian-step-number">1</div>
                        <h3><?php esc_html_e( 'Factusol en PC o Servidor', 'bentian-erp-bridge-for-factusol' ); ?></h3>
                        <p><?php esc_html_e( 'Bentian Agent se ejecuta como servicio en segundo plano en Windows, conectando a la base de datos de Factusol (.accdb, red local o NAS) con tolerancia a microcortes.', 'bentian-erp-bridge-for-factusol' ); ?></p>
                    </div>
                    <div class="bentian-step-arrow">➡️</div>
                    <div class="bentian-step">
                        <div class="bentian-step-number">2</div>
                        <h3><?php esc_html_e( 'Motor de Sincronización', 'bentian-erp-bridge-for-factusol' ); ?></h3>
                        <p><?php esc_html_e( 'Cuadre fiscal al céntimo en los 4 tramos de IVA, soporte nativo de variantes y tallas, actualización de precios y control de sobreventa en milisegundos.', 'bentian-erp-bridge-for-factusol' ); ?></p>
                    </div>
                    <div class="bentian-step-arrow">➡️</div>
                    <div class="bentian-step">
                        <div class="bentian-step-number">3</div>
                        <h3><?php esc_html_e( 'Tu Tienda WooCommerce', 'bentian-erp-bridge-for-factusol' ); ?></h3>
                        <p><?php esc_html_e( 'Este plugin optimiza las respuestas REST y recibe los pedidos para introducirlos automáticamente en Factusol como pedidos de cliente.', 'bentian-erp-bridge-for-factusol' ); ?></p>
                    </div>
                </div>
            </div>

            <!-- Panel de Caso de Éxito y Contacto Directo -->
            <div class="bentian-card bentian-footer-card">
                <div class="bentian-footer-grid">
                    <div>
                        <h3><?php esc_html_e( 'Probado en Producción Real', 'bentian-erp-bridge-for-factusol' ); ?></h3>
                        <p><?php esc_html_e( 'Conector desplegado y sincronizando catálogos de más de 1.500 referencias con variantes en Suministros Rubio.', 'bentian-erp-bridge-for-factusol' ); ?></p>
                        <a href="https://tienda.suministrosrubio.com/articulos" target="_blank" class="button">
                            <?php esc_html_e( 'Ver Tienda en Vivo ↗', 'bentian-erp-bridge-for-factusol' ); ?>
                        </a>
                    </div>
                    <div>
                        <h3><?php esc_html_e( 'Soporte Directo y Licencias Beta', 'bentian-erp-bridge-for-factusol' ); ?></h3>
                        <p><?php esc_html_e( '¿Eres una agencia o distribuidor informático? Solicita tu clave de prueba gratuita o soporte personalizado:', 'bentian-erp-bridge-for-factusol' ); ?></p>
                        <p><strong>Email:</strong> <a href="mailto:cristian@cristianjm.com">cristian@cristianjm.com</a></p>
                        <p><strong>Web Oficial:</strong> <a href="https://bridge.cristianjm.com" target="_blank">bridge.cristianjm.com</a></p>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }
}
