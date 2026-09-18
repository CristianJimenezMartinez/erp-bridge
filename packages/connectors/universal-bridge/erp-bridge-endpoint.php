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
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Bentian-Signature, X-Bentian-Timestamp, X-Bentian-Agent-Version, Idempotency-Key, X-File-Path, X-Product-SKU');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ----------------------------------------------------------------------------
// 1. CONFIGURACIÓN DE BASE DE DATOS Y SEGURIDAD
// ----------------------------------------------------------------------------
define('EB_SECRET_KEY', '%%EB_SECRET_KEY%%');
define('EB_DB_HOST', '%%EB_DB_HOST%%');
define('EB_DB_NAME', '%%EB_DB_NAME%%');
define('EB_DB_USER', '%%EB_DB_USER%%');
define('EB_DB_PASS', '%%EB_DB_PASS%%');

// Detección automática de WordPress SOLO como fallback si no se configuraron credenciales explícitas
if (EB_DB_NAME === '%%EB_DB_NAME%%' || empty(EB_DB_NAME)) {
    $wpConfigPath = file_exists(__DIR__ . '/wp-config.php') ? __DIR__ . '/wp-config.php' : (file_exists(dirname(__DIR__) . '/wp-config.php') ? dirname(__DIR__) . '/wp-config.php' : null);
    if ($wpConfigPath) {
        $wpContent = @file_get_contents($wpConfigPath);
        if ($wpContent) {
            // WordPress fallback si aplica
        }
    }
}

// ----------------------------------------------------------------------------
// 2. CONEXIÓN PDO A MARIADB / MYSQL LOCAL
// ----------------------------------------------------------------------------
function getDbConnection(&$errorMsg = null) {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    if (EB_DB_NAME === '%%EB_DB_NAME%%' || empty(EB_DB_NAME)) {
        $errorMsg = 'Nombre de base de datos no configurado (EB_DB_NAME está vacío)';
        return null;
    }

    $hosts = [EB_DB_HOST];
    if (EB_DB_HOST === '127.0.0.1') $hosts[] = 'localhost';
    else if (EB_DB_HOST === 'localhost') $hosts[] = '127.0.0.1';

    $lastException = null;
    foreach ($hosts as $h) {
        try {
            $dsn = "mysql:host=" . $h . ";dbname=" . EB_DB_NAME . ";charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            $pdo = new PDO($dsn, EB_DB_USER, EB_DB_PASS, $options);
            return $pdo;
        } catch (Exception $e) {
            $lastException = $e;
        }
    }

    $errorMsg = $lastException ? $lastException->getMessage() : 'Error desconocido al conectar con MariaDB/MySQL';
    return null;
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
              `sale_price` DECIMAL(12, 4) DEFAULT NULL,
              `vat_rate` DECIMAL(5, 2) NOT NULL DEFAULT 21.00,
              `price_with_vat` DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
              `sale_price_with_vat` DECIMAL(12, 4) DEFAULT NULL,
              `unit_of_measure` VARCHAR(20) DEFAULT 'UNIDADES',
              `weight` DECIMAL(10, 3) DEFAULT 0.000,
              `barcode` VARCHAR(50) DEFAULT NULL,
              `imgart` VARCHAR(255) DEFAULT NULL,
              `image_url` VARCHAR(500) DEFAULT NULL,
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
        try {
            $pdo->exec("ALTER TABLE `eb_products` ADD COLUMN IF NOT EXISTS `sale_price` DECIMAL(12, 4) DEFAULT NULL");
            $pdo->exec("ALTER TABLE `eb_products` ADD COLUMN IF NOT EXISTS `sale_price_with_vat` DECIMAL(12, 4) DEFAULT NULL");
            $pdo->exec("ALTER TABLE `eb_products` ADD COLUMN IF NOT EXISTS `imgart` VARCHAR(255) DEFAULT NULL");
            $pdo->exec("ALTER TABLE `eb_products` ADD COLUMN IF NOT EXISTS `image_url` VARCHAR(500) DEFAULT NULL");
        } catch (Exception $colErr) {}
        return true;
    } catch (Exception $e) {
        return false;
    }
}

// ----------------------------------------------------------------------------
// 4. DIRECTORIO BASE PARA IMÁGENES PÚBLICAS
// ----------------------------------------------------------------------------
function getPublicImagesBaseDir() {
    $candidates = [
        __DIR__ . '/assets/img/factusolImg',
        __DIR__ . '/tienda/assets/img/factusolImg',
        dirname(__DIR__) . '/tienda.suministrosrubio.com/assets/img/factusolImg',
        dirname(__DIR__) . '/tienda.suministrosrubio.com/httpdocs/assets/img/factusolImg',
        dirname(__DIR__) . '/tienda/assets/img/factusolImg',
        __DIR__ . '/uploads/products',
    ];
    foreach ($candidates as $cand) {
        if (is_dir($cand)) {
            return $cand;
        }
    }
    $defaultDir = __DIR__ . '/assets/img/factusolImg';
    if (!is_dir($defaultDir)) {
        @mkdir($defaultDir, 0755, true);
    }
    return $defaultDir;
}

// ----------------------------------------------------------------------------
// 5. AUTENTICACIÓN Y SEGURIDAD HMAC-SHA256 / BEARER
// ----------------------------------------------------------------------------
function verifyAuthentication() {
    $secret = EB_SECRET_KEY;
    if ($secret === '%%EB_SECRET_KEY%%' || empty($secret)) {
        http_response_code(503);
        echo json_encode(['error' => 'Endpoint no configurado: Clave secreta no establecida (EB_SECRET_KEY)']);
        exit;
    }

    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : (isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '');
    $signature = isset($headers['X-Bentian-Signature']) ? $headers['X-Bentian-Signature'] : (isset($_SERVER['HTTP_X_BENTIAN_SIGNATURE']) ? $_SERVER['HTTP_X_BENTIAN_SIGNATURE'] : '');
    $timestamp = isset($headers['X-Bentian-Timestamp']) ? intval($headers['X-Bentian-Timestamp']) : (isset($_SERVER['HTTP_X_BENTIAN_TIMESTAMP']) ? intval($_SERVER['HTTP_X_BENTIAN_TIMESTAMP']) : 0);

    // 1. Bearer Token
    if ($authHeader && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        if (hash_equals($secret, trim($matches[1]))) {
            return true;
        }
    }

    // 2. Query param directo (para tests o comprobaciones rápidas)
    $querySecret = isset($_GET['secret']) ? trim($_GET['secret']) : (isset($_GET['token']) ? trim($_GET['token']) : '');
    if ($querySecret && hash_equals($secret, $querySecret)) {
        return true;
    }

    // 3. Firma HMAC-SHA256
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
// 6. ENRUTADOR DE ACCIONES
// ----------------------------------------------------------------------------
$action = isset($_GET['action']) ? trim($_GET['action']) : 'ping';

if ($action === 'ping' || $action === 'health') {
    $dbErr = null;
    $pdo = getDbConnection($dbErr);
    $tablesOk = false;
    $articleCount = 0;
    if ($pdo) {
        $tablesOk = ensureTablesExist($pdo);
        try {
            $stmt = $pdo->query("SELECT COUNT(*) FROM eb_products");
            $articleCount = (int)$stmt->fetchColumn();
        } catch (Exception $e) {}
    }

    $baseImgDir = getPublicImagesBaseDir();

    echo json_encode([
        'status' => 'ok',
        'success' => true,
        'service' => 'Bentian ERP Bridge Universal Web Connector',
        'version' => '1.1.0',
        'phpVersion' => PHP_VERSION,
        'databaseConnected' => ($pdo !== null),
        'tablesReady' => $tablesOk,
        'articleCount' => $articleCount,
        'imagesSupported' => true,
        'imagesDirectory' => basename($baseImgDir),
        'database' => [
            'connected' => ($pdo !== null),
            'tablesReady' => $tablesOk,
            'articleCount' => $articleCount,
            'database' => (defined('EB_DB_NAME') && EB_DB_NAME !== '%%EB_DB_NAME%%') ? EB_DB_NAME : '',
            'error' => $dbErr,
        ],
        'error' => $dbErr,
        'timestamp' => time(),
        'https' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443),
    ]);
    exit;
}

// ----------------------------------------------------------------------------
// ACCIÓN: CHECK_IMAGES (Dirty-Checking de fotos existentes en hosting)
// ----------------------------------------------------------------------------
if ($action === 'check_images') {
    verifyAuthentication();
    $rawBody = file_get_contents('php://input');
    $data = json_decode($rawBody, true) ?: [];
    $imagesToCheck = isset($data['images']) && is_array($data['images']) ? $data['images'] : [];

    $baseDir = getPublicImagesBaseDir();
    $missing = [];
    $existing = [];

    foreach ($imagesToCheck as $img) {
        $relPath = is_array($img) ? ($img['path'] ?? '') : strval($img);
        $expectedSize = is_array($img) && isset($img['size']) ? intval($img['size']) : null;

        $cleanPath = ltrim(str_replace('\\', '/', $relPath), '/');
        if (empty($cleanPath) || strpos($cleanPath, '..') !== false) {
            continue;
        }

        $fullPath = $baseDir . '/' . $cleanPath;
        if (file_exists($fullPath) && is_file($fullPath)) {
            if ($expectedSize !== null && $expectedSize > 0) {
                $actualSize = filesize($fullPath);
                if (abs($actualSize - $expectedSize) <= 10) {
                    $existing[] = $relPath;
                    continue;
                }
            } else {
                $existing[] = $relPath;
                continue;
            }
        }
        $missing[] = $relPath;
    }

    echo json_encode([
        'success' => true,
        'totalChecked' => count($imagesToCheck),
        'existingCount' => count($existing),
        'missingCount' => count($missing),
        'missing' => $missing,
    ]);
    exit;
}

// ----------------------------------------------------------------------------
// ACCIÓN: UPLOAD_IMAGE (Subida Directa Turnkey de Fotos por HTTPS)
// ----------------------------------------------------------------------------
if ($action === 'upload_image') {
    verifyAuthentication();

    $targetRelPath = isset($_GET['path']) ? trim($_GET['path']) : '';
    if (empty($targetRelPath) && isset($_SERVER['HTTP_X_FILE_PATH'])) {
        $targetRelPath = trim($_SERVER['HTTP_X_FILE_PATH']);
    }

    // Saneamiento de seguridad estricto contra Directory Traversal
    $targetRelPath = ltrim(str_replace('\\', '/', $targetRelPath), '/');
    if (empty($targetRelPath) || strpos($targetRelPath, '..') !== false) {
        http_response_code(400);
        echo json_encode(['error' => 'Ruta de archivo no especificada o inválida']);
        exit;
    }

    // Validar extensión de imagen
    $ext = strtolower(pathinfo($targetRelPath, PATHINFO_EXTENSION));
    $allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp'];
    if (!in_array($ext, $allowedExts)) {
        http_response_code(400);
        echo json_encode(['error' => 'Extensión de imagen no permitida: ' . $ext]);
        exit;
    }

    $tempSource = null;
    $rawContent = null;
    if (isset($_FILES['image']) && is_uploaded_file($_FILES['image']['tmp_name'])) {
        $tempSource = $_FILES['image']['tmp_name'];
    } else if (isset($_FILES['file']) && is_uploaded_file($_FILES['file']['tmp_name'])) {
        $tempSource = $_FILES['file']['tmp_name'];
    } else {
        $rawContent = file_get_contents('php://input');
        if (empty($rawContent)) {
            http_response_code(400);
            echo json_encode(['error' => 'Contenido de imagen vacío']);
            exit;
        }
    }

    $baseDir = getPublicImagesBaseDir();
    $targetFullPath = $baseDir . '/' . $targetRelPath;
    $targetDir = dirname($targetFullPath);

    if (!is_dir($targetDir)) {
        @mkdir($targetDir, 0755, true);
    }

    if ($tempSource) {
        $saved = @move_uploaded_file($tempSource, $targetFullPath);
        if (!$saved) {
            $saved = @copy($tempSource, $targetFullPath);
        }
    } else {
        $saved = (file_put_contents($targetFullPath, $rawContent) !== false);
    }

    if (!$saved) {
        http_response_code(500);
        echo json_encode(['error' => 'No se pudo escribir el archivo en el servidor: ' . $targetRelPath]);
        exit;
    }

    // Replicación secundaria automática hacia tienda.suministrosrubio.com si existe en el hosting
    $subdomainCandidates = [
        dirname(__DIR__) . '/tienda.suministrosrubio.com/assets/img/factusolImg/' . $targetRelPath,
        dirname(__DIR__) . '/tienda.suministrosrubio.com/httpdocs/assets/img/factusolImg/' . $targetRelPath,
        __DIR__ . '/tienda/assets/img/factusolImg/' . $targetRelPath,
    ];
    foreach ($subdomainCandidates as $subCand) {
        $subDir = dirname($subCand);
        if (is_dir(dirname($subDir))) {
            if (!is_dir($subDir)) @mkdir($subDir, 0755, true);
            @copy($targetFullPath, $subCand);
        }
    }

    // Actualizar registro del producto en MariaDB si se suministró SKU
    $sku = isset($_GET['sku']) ? trim($_GET['sku']) : (isset($_SERVER['HTTP_X_PRODUCT_SKU']) ? trim($_SERVER['HTTP_X_PRODUCT_SKU']) : null);
    if ($sku) {
        $pdo = getDbConnection();
        if ($pdo) {
            try {
                $canonicalImgPath = (strpos($targetRelPath, '/') === 0) ? $targetRelPath : ('/' . $targetRelPath);
                $updateStmt = $pdo->prepare("UPDATE `eb_products` SET `imgart` = :img WHERE `code` = :sku OR `sku` = :sku");
                $updateStmt->execute([':img' => $canonicalImgPath, ':sku' => $sku]);
            } catch (Exception $e) {}
        }
    }

    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'suministrosrubio.com';
    $publicUrl = "{$scheme}://{$host}/assets/img/factusolImg/{$targetRelPath}";

    echo json_encode([
        'success' => true,
        'path' => $targetRelPath,
        'bytesWritten' => filesize($targetFullPath),
        'url' => $publicUrl,
    ]);
    exit;
}

// ----------------------------------------------------------------------------
// ACCIONES DE LECTURA DE CATÁLOGO (Compatible con Angular de Suministros Rubio)
// ----------------------------------------------------------------------------
if ($action === 'catalog' || $action === 'articles') {
    verifyAuthentication();
    $pdo = getDbConnection();
    if (!$pdo) {
        http_response_code(503);
        echo json_encode(['error' => 'Base de datos no disponible']);
        exit;
    }
    ensureTablesExist($pdo);
    $stmt = $pdo->query("
        SELECT 
            p.code AS codart,
            p.name AS desart,
            p.description AS dewart,
            p.price AS pcoart,
            p.sale_price AS sale_price,
            p.price_with_vat AS pvp,
            p.sale_price_with_vat AS sale_pvp,
            p.family_code AS famart,
            p.barcode AS eanart,
            p.unit_of_measure AS measure,
            p.vat_rate AS tivart,
            IF(p.imgart IS NOT NULL AND p.imgart != '', 
               IF(p.imgart LIKE '/%', p.imgart, CONCAT('/', p.imgart)), 
               '') AS imgart,
            p.image_url AS image_url,
            p.active,
            p.section_code,
            p.section_name,
            p.family_name,
            COALESCE(s.stock, 0) AS stock 
        FROM eb_products p 
        LEFT JOIN eb_stock s ON p.code = s.code 
        WHERE p.active = 1
        ORDER BY p.name ASC
    ");
    $items = $stmt->fetchAll();

    $stmtMeasures = $pdo->query("SELECT DISTINCT unit_of_measure FROM eb_products WHERE unit_of_measure IS NOT NULL AND unit_of_measure != ''");
    $measures = $stmtMeasures->fetchAll(PDO::FETCH_COLUMN) ?: ['UNIDADES'];

    echo json_encode(['success' => true, 'count' => count($items), 'articles' => $items, 'measures' => $measures]);
    exit;
}

if ($action === 'family') {
    verifyAuthentication();
    $pdo = getDbConnection();
    if (!$pdo) {
        http_response_code(503);
        echo json_encode(['error' => 'Base de datos no disponible']);
        exit;
    }
    ensureTablesExist($pdo);
    $famId = isset($_GET['id']) ? trim($_GET['id']) : (isset($_GET['famId']) ? trim($_GET['famId']) : '');
    $stmt = $pdo->prepare("
        SELECT 
            p.code AS codart,
            p.name AS desart,
            p.description AS dewart,
            p.price AS pcoart,
            p.sale_price AS sale_price,
            p.price_with_vat AS pvp,
            p.sale_price_with_vat AS sale_pvp,
            p.family_code AS famart,
            p.barcode AS eanart,
            p.unit_of_measure AS measure,
            p.vat_rate AS tivart,
            IF(p.imgart IS NOT NULL AND p.imgart != '', 
               IF(p.imgart LIKE '/%', p.imgart, CONCAT('/', p.imgart)), 
               '') AS imgart,
            p.image_url AS image_url,
            COALESCE(s.stock, 0) AS stock 
        FROM eb_products p 
        LEFT JOIN eb_stock s ON p.code = s.code 
        WHERE p.active = 1 AND p.family_code = :famId
        ORDER BY p.name ASC
    ");
    $stmt->execute([':famId' => $famId]);
    $items = $stmt->fetchAll();
    echo json_encode($items);
    exit;
}

if ($action === 'measures') {
    verifyAuthentication();
    $pdo = getDbConnection();
    if (!$pdo) {
        http_response_code(503);
        echo json_encode(['error' => 'Base de datos no disponible']);
        exit;
    }
    ensureTablesExist($pdo);
    $stmt = $pdo->query("SELECT DISTINCT unit_of_measure FROM eb_products WHERE unit_of_measure IS NOT NULL AND unit_of_measure != ''");
    $measures = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: ['UNIDADES'];
    echo json_encode(['measures' => $measures]);
    exit;
}

// Endpoint para creación de pedidos desde pasarela web
if ($action === 'create_order') {
    verifyAuthentication();
    $pdo = getDbConnection();
    if (!$pdo) {
        http_response_code(503);
        echo json_encode(['error' => 'Base de datos no disponible']);
        exit;
    }
    ensureTablesExist($pdo);

    $rawBody = file_get_contents('php://input');
    $payload = json_decode($rawBody, true) ?: [];

    $shipping = $payload['shippingData'] ?? [];
    $orderData = $payload['order'] ?? [];
    $lines = $orderData['lines'] ?? $payload['lines'] ?? [];
    $total = floatval($orderData['total'] ?? $payload['total'] ?? 0);
    $subtotal = floatval($orderData['subtotal'] ?? $payload['subtotal'] ?? $total);
    $taxTotal = floatval($orderData['taxTotal'] ?? $payload['taxTotal'] ?? 0);
    $shippingCost = floatval($payload['shippingCost'] ?? 0);
    $orderNumber = 'WEB-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -5));

    $stmt = $pdo->prepare("
        INSERT INTO `eb_orders`
          (`order_number`, `status`, `customer_data`, `order_lines`, `payment_method`, `payment_status`, `payment_reference`, `subtotal`, `tax_total`, `shipping_cost`, `total`, `created_at`)
        VALUES
          (:orderNum, 'PENDING', :custData, :linesData, :payMethod, :payStatus, :payRef, :subtotal, :taxTotal, :shipCost, :total, NOW())
    ");

    $success = $stmt->execute([
        ':orderNum' => $orderNumber,
        ':custData' => json_encode($shipping, JSON_UNESCAPED_UNICODE),
        ':linesData' => json_encode($lines, JSON_UNESCAPED_UNICODE),
        ':payMethod' => substr($payload['paymentMethodType'] ?? 'pasarela', 0, 50),
        ':payStatus' => 'COMPLETED',
        ':payRef' => substr($payload['paymentMethodId'] ?? '', 0, 100),
        ':subtotal' => $subtotal,
        ':taxTotal' => $taxTotal,
        ':shipCost' => $shippingCost,
        ':total' => $total,
    ]);

    $newId = $pdo->lastInsertId();
    echo json_encode([
        'success' => $success,
        'pedidoId' => intval($newId),
        'orderNumber' => $orderNumber,
        'message' => 'Pedido registrado correctamente en espera de Factusol',
    ]);
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

// ----------------------------------------------------------------------------
// ACCIÓN: PUSH_CATALOG (Subida de productos desde Bentian Agent)
// ----------------------------------------------------------------------------
if ($action === 'push_catalog') {
    $products = isset($data['products']) && is_array($data['products']) ? $data['products'] : [];
    if (empty($products)) {
        echo json_encode(['success' => true, 'processed' => 0, 'message' => 'Lote vacío']);
        exit;
    }

    $stmt = $pdo->prepare("
        INSERT INTO `eb_products` 
          (`code`, `sku`, `name`, `description`, `section_code`, `section_name`, `family_code`, `family_name`, `price`, `sale_price`, `vat_rate`, `price_with_vat`, `sale_price_with_vat`, `unit_of_measure`, `weight`, `barcode`, `imgart`, `image_url`, `active`)
        VALUES 
          (:code, :sku, :name, :description, :section_code, :section_name, :family_code, :family_name, :price, :sale_price, :vat_rate, :price_with_vat, :sale_price_with_vat, :unit_of_measure, :weight, :barcode, :imgart, :image_url, :active)
        ON DUPLICATE KEY UPDATE
          `sku` = VALUES(`sku`),
          `name` = VALUES(`name`),
          `description` = VALUES(`description`),
          `section_code` = VALUES(`section_code`),
          `section_name` = VALUES(`section_name`),
          `family_code` = VALUES(`family_code`),
          `family_name` = VALUES(`family_name`),
          `price` = VALUES(`price`),
          `sale_price` = VALUES(`sale_price`),
          `vat_rate` = VALUES(`vat_rate`),
          `price_with_vat` = VALUES(`price_with_vat`),
          `sale_price_with_vat` = VALUES(`sale_price_with_vat`),
          `unit_of_measure` = VALUES(`unit_of_measure`),
          `weight` = VALUES(`weight`),
          `barcode` = VALUES(`barcode`),
          `imgart` = COALESCE(VALUES(`imgart`), `eb_products`.`imgart`),
          `image_url` = COALESCE(VALUES(`image_url`), `eb_products`.`image_url`),
          `active` = VALUES(`active`),
          `updated_at` = NOW()
    ");

    $pdo->beginTransaction();
    $count = 0;
    try {
        foreach ($products as $p) {
            $vat = floatval($p['vatRate'] ?? 21.0);
            $regPrice = floatval($p['price'] ?? 0);
            $rawSale = isset($p['salePrice']) ? floatval($p['salePrice']) : null;
            $salePrice = ($rawSale !== null && $rawSale > 0 && $rawSale < $regPrice) ? $rawSale : null;
            $saleWithVat = $salePrice !== null ? round($salePrice * (1 + $vat / 100), 4) : null;

            // Extraer y normalizar imgart
            $rawImg = '';
            if (!empty($p['imgart'])) {
                $rawImg = $p['imgart'];
            } else if (!empty($p['images']) && is_array($p['images']) && !empty($p['images'][0]['url'])) {
                $rawImg = $p['images'][0]['url'];
            }
            $cleanImg = trim(str_replace('\\', '/', $rawImg));
            if (!empty($cleanImg) && strpos($cleanImg, '/') !== 0) {
                $cleanImg = '/' . $cleanImg;
            }

            $imageUrl = !empty($p['imageUrl']) ? $p['imageUrl'] : (!empty($p['image_url']) ? $p['image_url'] : null);

            $stmt->execute([
                ':code' => substr($p['code'] ?? '', 0, 50),
                ':sku' => substr($p['sku'] ?? $p['code'] ?? '', 0, 50),
                ':name' => substr($p['name'] ?? $p['description'] ?? 'Artículo sin nombre', 0, 255),
                ':description' => $p['description'] ?? '',
                ':section_code' => substr($p['sectionCode'] ?? '', 0, 10),
                ':section_name' => substr($p['sectionName'] ?? '', 0, 100),
                ':family_code' => substr($p['familyCode'] ?? '', 0, 10),
                ':family_name' => substr($p['familyName'] ?? '', 0, 100),
                ':price' => $regPrice,
                ':sale_price' => $salePrice,
                ':vat_rate' => $vat,
                ':price_with_vat' => floatval($p['priceWithVat'] ?? ($regPrice * (1 + $vat / 100))),
                ':sale_price_with_vat' => $saleWithVat,
                ':unit_of_measure' => substr($p['unitOfMeasure'] ?? 'UNIDADES', 0, 20),
                ':weight' => floatval($p['weight'] ?? 0),
                ':barcode' => substr($p['barcode'] ?? '', 0, 50),
                ':imgart' => !empty($cleanImg) ? substr($cleanImg, 0, 255) : null,
                ':image_url' => !empty($imageUrl) ? substr($imageUrl, 0, 500) : null,
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

// ----------------------------------------------------------------------------
// ACCIÓN: PUSH_STOCK
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// ACCIÓN: PULL_ORDERS
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// ACCIÓN: ACK_ORDERS
// ----------------------------------------------------------------------------
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
