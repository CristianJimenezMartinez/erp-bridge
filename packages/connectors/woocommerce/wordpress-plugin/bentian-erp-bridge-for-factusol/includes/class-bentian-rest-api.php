<?php
/**
 * Controlador de Endpoints REST API y Webhooks para Bentian ERP Bridge
 */

defined( 'ABSPATH' ) || exit;

class Bentian_Bridge_REST_API {

    private static $instance = null;

    public static function get_instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action( 'rest_api_init', array( $this, 'register_routes' ) );
        add_action( 'woocommerce_order_status_changed', array( $this, 'on_order_status_changed' ), 10, 4 );
    }

    /**
     * Registro de rutas REST en /wp-json/bentian/v1/
     */
    public function register_routes() {
        register_rest_route( 'bentian/v1', '/ping', array(
            'methods'             => 'GET',
            'callback'            => array( $this, 'endpoint_ping' ),
            'permission_callback' => '__return_true',
        ) );

        register_rest_route( 'bentian/v1', '/status', array(
            'methods'             => 'GET',
            'callback'            => array( $this, 'endpoint_status' ),
            'permission_callback' => array( $this, 'check_admin_or_signature' ),
        ) );

        register_rest_route( 'bentian/v1', '/generate-credentials', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'endpoint_generate_credentials' ),
            'permission_callback' => function() {
                return current_user_can( 'manage_woocommerce' );
            },
        ) );
    }

    /**
     * Endpoint ultrarrápido de latencia y comprobación
     */
    public function endpoint_ping( $request ) {
        $hpos = false;
        if ( class_exists( '\Automattic\WooCommerce\Utilities\OrderUtil' ) ) {
            $hpos = \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled();
        }

        return new WP_REST_Response( array(
            'status'              => 'ok',
            'service'             => 'Bentian ERP Bridge',
            'version'             => BENTIAN_BRIDGE_VERSION,
            'woocommerce_version' => defined( 'WC_VERSION' ) ? WC_VERSION : 'unknown',
            'php_version'         => PHP_VERSION,
            'hpos_enabled'        => $hpos,
            'ssl'                 => is_ssl(),
            'timestamp'           => time(),
        ), 200 );
    }

    /**
     * Diagnóstico completo de la tienda para el Agente Windows
     */
    public function endpoint_status( $request ) {
        global $wpdb;

        $hpos = false;
        if ( class_exists( '\Automattic\WooCommerce\Utilities\OrderUtil' ) ) {
            $hpos = \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled();
        }

        // Conteo rápido de productos y pedidos
        $product_count = (int) wp_count_posts( 'product' )->publish;
        $order_count   = wc_orders_count( 'processing' ) + wc_orders_count( 'completed' );

        return new WP_REST_Response( array(
            'bridge_version'      => BENTIAN_BRIDGE_VERSION,
            'site_name'           => get_bloginfo( 'name' ),
            'site_url'            => get_site_url(),
            'rest_url'            => rest_url(),
            'wc_version'          => defined( 'WC_VERSION' ) ? WC_VERSION : 'unknown',
            'wp_version'          => get_bloginfo( 'version' ),
            'hpos_active'         => $hpos,
            'products_published'  => $product_count,
            'orders_total'        => $order_count,
            'currency'            => get_woocommerce_currency(),
            'prices_include_tax'  => wc_prices_include_tax(),
            'timezone'            => wp_timezone_string(),
            'server_time'         => current_time( 'mysql' ),
        ), 200 );
    }

    /**
     * Generador automático de claves REST API para Bentian Agent
     */
    public function endpoint_generate_credentials( $request ) {
        if ( ! current_user_can( 'manage_woocommerce' ) ) {
            return new WP_Error( 'forbidden', 'Permisos insuficientes', array( 'status' => 403 ) );
        }

        $user_id = get_current_user_id();
        $description = 'Bentian ERP Bridge (Factusol Agent)';

        // Generar consumer key y consumer secret nativos de WooCommerce
        $consumer_key    = 'ck_' . wc_rand_hash();
        $consumer_secret = 'cs_' . wc_rand_hash();

        global $wpdb;
        $result = $wpdb->insert(
            $wpdb->prefix . 'woocommerce_api_keys',
            array(
                'user_id'         => $user_id,
                'description'     => $description,
                'permissions'     => 'read_write',
                'consumer_key'    => wc_api_hash( $consumer_key ),
                'consumer_secret' => $consumer_secret,
                'truncated_key'   => substr( $consumer_key, -7 ),
                'last_access'     => null,
            ),
            array( '%d', '%s', '%s', '%s', '%s', '%s', '%s' )
        );

        if ( ! $result ) {
            return new WP_Error( 'db_error', 'No se pudieron generar las claves en la base de datos de WooCommerce', array( 'status' => 500 ) );
        }

        // Guardar identificador para referencia
        $key_id = $wpdb->insert_id;
        update_option( 'bentian_last_generated_key_id', $key_id );

        return new WP_REST_Response( array(
            'success'         => true,
            'key_id'          => $key_id,
            'consumer_key'    => $consumer_key,
            'consumer_secret' => $consumer_secret,
            'api_url'         => get_site_url(),
            'message'         => 'Claves generadas con éxito para Bentian ERP Bridge.',
        ), 200 );
    }

    /**
     * Verificación de permisos para endpoints seguros
     */
    public function check_admin_or_signature( $request ) {
        if ( current_user_can( 'manage_woocommerce' ) ) {
            return true;
        }

        // Verificación alternativa por cabecera de clave compartida
        $settings = get_option( 'bentian_bridge_settings', array() );
        $configured_secret = isset( $settings['webhook_secret'] ) ? $settings['webhook_secret'] : '';
        $provided_secret   = $request->get_header( 'x-bentian-secret' );

        if ( ! empty( $configured_secret ) && ! empty( $provided_secret ) && hash_equals( $configured_secret, $provided_secret ) ) {
            return true;
        }

        return new WP_Error( 'rest_forbidden', 'Acceso denegado a las métricas del puente Bentian.', array( 'status' => 401 ) );
    }

    /**
     * Hook al cambiar el estado de un pedido (ej. de pendiente a procesando)
     */
    public function on_order_status_changed( $order_id, $old_status, $new_status, $order ) {
        $settings = get_option( 'bentian_bridge_settings', array() );
        if ( empty( $settings['realtime_orders'] ) ) {
            return;
        }

        // Si el estado es relevante para Factusol (procesando / completado)
        if ( in_array( $new_status, array( 'processing', 'completed', 'on-hold' ), true ) ) {
            // Guardar timestamp del último pedido para consulta del agente
            update_option( 'bentian_last_order_event', array(
                'order_id'   => $order_id,
                'status'     => $new_status,
                'timestamp'  => time(),
                'total'      => $order ? $order->get_total() : 0,
            ) );
        }
    }
}
