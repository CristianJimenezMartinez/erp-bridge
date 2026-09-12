<?php
/**
 * ============================================================================
 * Bentian ERP Bridge — Conector Web Universal (HTTPS Bridge)
 * Archivo Único Autocontenido para Cualquier Web, Hosting o CMS
 * ============================================================================
 * Puerto: 443 (HTTPS Seguro)
 * Protocolo: HMAC-SHA256 / Bearer Token
 * Requisitos: PHP 7.4 o superior, PDO MySQL / MariaDB
 * Ubicación: Carpeta pública de tu web (public_html, httpdocs, www, etc.)
 * ============================================================================
 */

// Desactivar salida de errores HTML para garantizar JSON estricto
error_reporting(0);
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Bentian-Signature, X-Bentian-Timestamp, X-Bentian-Agent-Version, Idempotency-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ----------------------------------------------------------------------------
// 1. CONFIGURACIÓN DE BASE DE DATOS Y SEGURIDAD
// ----------------------------------------------------------------------------
define('EB_SECRET_KEY', '%%EB_SECRET_KEY%%');

// Detección automática de WordPress si existe en la misma carpeta o superior
$wpConfigPath = file_exists(__DIR__ . '/wp-config.php') ? __DIR__ . '/wp-config.php' : (file_exists(dirname(__DIR__) . '/wp-config.php') ? dirname(__DIR__) . '/wp-config.php' : null);

if ($wpConfigPath && !defined('EB_DB_NAME')) {
    $wpContent = @file_get_contents($wpConfigPath);
    if ($wpContent) {
        if (preg_match("/define\s*\(\s*['\"]DB_NAME['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)/", $wpContent, $m)) define('EB_DB_NAME', $m[1]);
        if (preg_match("/define\s*\(\s*['\"]DB_USER['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)/", $wpContent, $m)) define('EB_DB_USER', $m[1]);
        if (preg_match("/define\s*\(\s*['\"]DB_PASSWORD['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)/", $wpContent, $m)) define('EB_DB_PASS', $m[1]);
        if (preg_match("/define\s*\(\s*['\"]DB_HOST['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)/", $wpContent, $m)) define('EB_DB_HOST', $m[1]);
    }
}

if (!defined('EB_DB_HOST')) define('EB_DB_HOST', '127.0.0.1');
if (!defined('EB_DB_NAME')) define('EB_DB_NAME', '%%EB_DB_NAME%%');
if (!defined('EB_DB_USER')) define('EB_DB_USER', '%%EB_DB_USER%%');
if (!defined('EB_DB_PASS')) define('EB_DB_PASS', '%%EB_DB_PASS%%');

// ----------------------------------------------------------------------------
// 2. CONEXIÓN PDO A MARIADB / MYSQL LOCAL
// ----------------------------------------------------------------------------
function getDbConnection() {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    if (EB_DB_NAME === '%%EB_DB_NAME%%' || empty(EB_DB_NAME)) {
        return null;
    }

    try {
        $dsn = "mysql:host=" . EB_DB_HOST . ";dbname=" . EB_DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        $pdo = new PDO($dsn, EB_DB_USER, EB_DB_PASS, $options);
        return $pdo;
    } catch (Exception $e) {
        return null;
    }
}

// ----------------------------------------------------------------------------
// 3. AUTO-INSTALACIÓN DE TABLAS CANÓNICAS (IDEMPOTENTE)
// ----------------------------------------------------------------------------
function ensureTablesExist($pdo) {
    if (!$pdo) return false;
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `eb_products` (
              `code` VARCHAR(50) NOT NULL PRIMARY KEY,
              `sku` VARCHAR(50) DEFAULT NULL,
              `name` VARCHAR(255) NOT NULL,
              `description` TEXT DEFAULT NULL,
              `section_code` VARCHAR(10) DEFAULT NULL,
              `section_name` VARCHAR(100) DEFAULT NULL,
              `family_code` VARCHAR(10) DEFAULT NULL,
              `family_name` VARCHAR(100) DEFAULT NULL,
              `price` DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
              `vat_rate` DECIMAL(5, 2) NOT NULL DEFAULT 21.00,
              `price_with_vat` DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
              `unit_of_measure` VARCHAR(20) DEFAULT 'UNIDADES',
              `weight` DECIMAL(10, 3) DEFAULT 0.000,
              `barcode` VARCHAR(50) DEFAULT NULL,
              `active` TINYINT(1) NOT NULL DEFAULT 1,
              `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              INDEX `idx_family` (`family_code`),
              INDEX `idx_active` (`active`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `eb_stock` (
              `code` VARCHAR(50) NOT NULL PRIMARY KEY,
              `stock` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
              `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              INDEX `idx_stock_val` (`stock`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `eb_orders` (
              `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
              `order_number` VARCHAR(50) NOT NULL UNIQUE,
              `status` ENUM('PENDING', 'SYNCED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
              `customer_data` LONGTEXT NOT NULL,
              `order_lines` LONGTEXT NOT NULL,
              `payment_method` VARCHAR(50) NOT NULL,
              `payment_status` VARCHAR(50) NOT NULL,
              `payment_reference` VARCHAR(100) DEFAULT NULL,
              `subtotal` DECIMAL(12, 2) NOT NULL,
              `tax_total` DECIMAL(12, 2) NOT NULL,
              `shipping_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
              `total` DECIMAL(12, 2) NOT NULL,
              `factusol_order_number` INT DEFAULT NULL,
              `factusol_series` VARCHAR(5) DEFAULT NULL,
              `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              `synced_at` TIMESTAMP NULL DEFAULT NULL,
              INDEX `idx_status` (`status`),
              INDEX `idx_created` (`created_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
        return true;
    } catch (Exception $e) {
        return false;
    }
}

// ----------------------------------------------------------------------------
// 4. AUTENTICACIÓN Y SEGURIDAD HMAC-SHA256
// ----------------------------------------------------------------------------
function verifyAuthentication() {
    $secret = EB_SECRET_KEY;
    if ($secret === '%%EB_SECRET_KEY%%' || empty($secret)) {
        return true;
    }

    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : (isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '');
    $signature = isset($headers['X-Bentian-Signature']) ? $headers['X-Bentian-Signature'] : (isset($_SERVER['HTTP_X_BENTIAN_SIGNATURE']) ? $_SERVER['HTTP_X_BENTIAN_SIGNATURE'] : '');
    $timestamp = isset($headers['X-Bentian-Timestamp']) ? intval($headers['X-Bentian-Timestamp']) : (isset($_SERVER['HTTP_X_BENTIAN_TIMESTAMP']) ? intval($_SERVER['HTTP_X_BENTIAN_TIMESTAMP']) : 0);

    if ($authHeader && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        if (hash_equals($secret, trim($matches[1]))) {
            return true;
        }
    }

    if ($signature && $timestamp > 0) {
        if (abs(time() - $timestamp) > 300) {
            http_response_code(401);
            echo json_encode(['error' => 'Timestamp expirado (desfase superior a 5 minutos)']);
            exit;
        }
        $rawPayload = file_get_contents('php://input');
        $expectedSignature = hash_hmac('sha256', $timestamp . $rawPayload, $secret);
        if (hash_equals($expectedSignature, $signature)) {
            return true;
        }
    }

    http_response_code(401);
    echo json_encode(['error' => 'Firma o token de autorización no válido']);
    exit;
}

// ----------------------------------------------------------------------------
// 5. ENRUTADOR DE ACCIONES
// ----------------------------------------------------------------------------
$action = isset($_GET['action']) ? trim($_GET['action']) : 'ping';

if ($action === 'ping') {
    $pdo = getDbConnection();
    echo json_encode([
        'status' => 'ok',
        'service' => 'Bentian ERP Bridge Universal Web Connector',
        'version' => '1.0.0',
        'phpVersion' => PHP_VERSION,
        'dbConfigured' => ($pdo !== null),
        'timestamp' => time(),
        'https' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443),
    ]);
    exit;
}

if ($action === 'health') {
    verifyAuthentication();
    $pdo = getDbConnection();
    $dbOk = false;
    $tablesOk = false;
    if ($pdo) {
        $dbOk = true;
        $tablesOk = ensureTablesExist($pdo);
    }
    echo json_encode([
        'success' => $dbOk && $tablesOk,
        'phpVersion' => PHP_VERSION,
        'databaseConnected' => $dbOk,
        'tablesReady' => $tablesOk,
        'serverTime' => date('c'),
    ]);
    exit;
}

if ($action === 'catalog') {
    $pdo = getDbConnection();
    if (!$pdo) {
        http_response_code(503);
        echo json_encode(['error' => 'Base de datos no disponible']);
        exit;
    }
    ensureTablesExist($pdo);
    $stmt = $pdo->query("
        SELECT p.*, COALESCE(s.stock, 0) as stock 
        FROM eb_products p 
        LEFT JOIN eb_stock s ON p.code = s.code 
        WHERE p.active = 1
        ORDER BY p.name ASC
    ");
    $items = $stmt->fetchAll();
    echo json_encode(['success' => true, 'count' => count($items), 'articles' => $items]);
    exit;
}

verifyAuthentication();

$pdo = getDbConnection();
if (!$pdo) {
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo conectar a la base de datos MariaDB/MySQL local']);
    exit;
}
ensureTablesExist($pdo);

$rawBody = file_get_contents('php://input');
$data = json_decode($rawBody, true) ?: [];

if ($action === 'push_catalog') {
    $products = isset($data['products']) && is_array($data['products']) ? $data['products'] : [];
    if (empty($products)) {
        echo json_encode(['success' => true, 'processed' => 0, 'message' => 'Lote vacío']);
        exit;
    }

    $stmt = $pdo->prepare("
        INSERT INTO `eb_products` 
          (`code`, `sku`, `name`, `description`, `section_code`, `section_name`, `family_code`, `family_name`, `price`, `vat_rate`, `price_with_vat`, `unit_of_measure`, `weight`, `barcode`, `active`)
        VALUES 
          (:code, :sku, :name, :description, :section_code, :section_name, :family_code, :family_name, :price, :vat_rate, :price_with_vat, :unit_of_measure, :weight, :barcode, :active)
        ON DUPLICATE KEY UPDATE
          `sku` = VALUES(`sku`),
          `name` = VALUES(`name`),
          `description` = VALUES(`description`),
          `section_code` = VALUES(`section_code`),
          `section_name` = VALUES(`section_name`),
          `family_code` = VALUES(`family_code`),
          `family_name` = VALUES(`family_name`),
          `price` = VALUES(`price`),
          `vat_rate` = VALUES(`vat_rate`),
          `price_with_vat` = VALUES(`price_with_vat`),
          `unit_of_measure` = VALUES(`unit_of_measure`),
          `weight` = VALUES(`weight`),
          `barcode` = VALUES(`barcode`),
          `active` = VALUES(`active`),
          `updated_at` = NOW()
    ");

    $pdo->beginTransaction();
    $count = 0;
    try {
        foreach ($products as $p) {
            $stmt->execute([
                ':code' => substr($p['code'] ?? '', 0, 50),
                ':sku' => substr($p['sku'] ?? $p['code'] ?? '', 0, 50),
                ':name' => substr($p['name'] ?? $p['description'] ?? 'Artículo sin nombre', 0, 255),
                ':description' => $p['description'] ?? '',
                ':section_code' => substr($p['sectionCode'] ?? '', 0, 10),
                ':section_name' => substr($p['sectionName'] ?? '', 0, 100),
                ':family_code' => substr($p['familyCode'] ?? '', 0, 10),
                ':family_name' => substr($p['familyName'] ?? '', 0, 100),
                ':price' => floatval($p['price'] ?? 0),
                ':vat_rate' => floatval($p['vatRate'] ?? 21.0),
                ':price_with_vat' => floatval($p['priceWithVat'] ?? 0),
                ':unit_of_measure' => substr($p['unitOfMeasure'] ?? 'UNIDADES', 0, 20),
                ':weight' => floatval($p['weight'] ?? 0),
                ':barcode' => substr($p['barcode'] ?? '', 0, 50),
                ':active' => ($p['active'] ?? true) ? 1 : 0,
            ]);
            $count++;
        }
        $pdo->commit();
        echo json_encode(['success' => true, 'processed' => $count]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Fallo al insertar lote de productos: ' . $e->getMessage()]);
    }
    exit;
}

if ($action === 'push_stock') {
    $updates = isset($data['stockUpdates']) && is_array($data['stockUpdates']) ? $data['stockUpdates'] : [];
    if (empty($updates)) {
        echo json_encode(['success' => true, 'updated' => 0]);
        exit;
    }

    $stmt = $pdo->prepare("
        INSERT INTO `eb_stock` (`code`, `stock`, `updated_at`)
        VALUES (:code, :stock, NOW())
        ON DUPLICATE KEY UPDATE `stock` = VALUES(`stock`), `updated_at` = NOW()
    ");

    $pdo->beginTransaction();
    $count = 0;
    try {
        foreach ($updates as $u) {
            $stmt->execute([
                ':code' => substr($u['code'] ?? '', 0, 50),
                ':stock' => floatval($u['stock'] ?? 0),
            ]);
            $count++;
        }
        $pdo->commit();
        echo json_encode(['success' => true, 'updated' => $count]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Fallo al actualizar stock: ' . $e->getMessage()]);
    }
    exit;
}

if ($action === 'pull_orders') {
    $limit = isset($_GET['limit']) ? max(1, min(100, intval($_GET['limit']))) : 50;
    $stmt = $pdo->prepare("SELECT * FROM `eb_orders` WHERE `status` = 'PENDING' ORDER BY `id` ASC LIMIT :lim");
    $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
    $stmt->execute();
    $rawOrders = $stmt->fetchAll();

    $orders = [];
    foreach ($rawOrders as $row) {
        $orders[] = [
            'id' => intval($row['id']),
            'orderNumber' => $row['order_number'],
            'status' => $row['status'],
            'customer' => json_decode($row['customer_data'], true) ?: [],
            'lines' => json_decode($row['order_lines'], true) ?: [],
            'paymentMethod' => $row['payment_method'],
            'paymentStatus' => $row['payment_status'],
            'paymentReference' => $row['payment_reference'],
            'subtotal' => floatval($row['subtotal']),
            'taxTotal' => floatval($row['tax_total']),
            'shippingCost' => floatval($row['shipping_cost']),
            'total' => floatval($row['total']),
            'createdAt' => $row['created_at'],
        ];
    }
    echo json_encode(['success' => true, 'orders' => $orders]);
    exit;
}

if ($action === 'ack_orders') {
    $confirmations = isset($data['confirmations']) && is_array($data['confirmations']) ? $data['confirmations'] : [];
    $stmt = $pdo->prepare("
        UPDATE `eb_orders`
        SET `status` = 'SYNCED',
            `factusol_order_number` = :fOrder,
            `factusol_series` = :fSeries,
            `synced_at` = NOW()
        WHERE `id` = :id
    ");

    $pdo->beginTransaction();
    $count = 0;
    try {
        foreach ($confirmations as $c) {
            $stmt->execute([
                ':id' => intval($c['webOrderId']),
                ':fOrder' => intval($c['factusolOrderNumber'] ?? 0),
                ':fSeries' => substr($c['factusolSeries'] ?? 'A', 0, 5),
            ]);
            $count++;
        }
        $pdo->commit();
        echo json_encode(['success' => true, 'acknowledged' => $count]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Fallo al confirmar pedidos: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Acción no válida: ' . htmlspecialchars($action)]);
