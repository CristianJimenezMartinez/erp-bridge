<?php
/**
 * ============================================================================
 * Bentian ERP Bridge — Conector Web Universal (HTTPS Bridge v1.1.0)
 * Suministros Rubio & Tienda Online
 * ============================================================================
 * Puerto: 443 (HTTPS Seguro)
 * Protocolo: HMAC-SHA256 / Bearer Token
 * Requisitos: PHP 7.4 o superior, PDO MariaDB / MySQL
 * Ubicación en Plesk: httpdocs/erp-bridge-endpoint.php
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
// 1. CONFIGURACIÓN DE BASE DE DATOS Y SEGURIDAD (SUMINISTROS RUBIO)
// ----------------------------------------------------------------------------
define('EB_SECRET_KEY', 'rubio_secreto_2026');
define('EB_DB_HOST', 'localhost');
define('EB_DB_NAME', 'suministros_tienda');
define('EB_DB_USER', 'tienda_user');
define('EB_DB_PASS', 'fGC3IaLKvvGmhW47XF6X');

// ----------------------------------------------------------------------------
// 2. CONEXIÓN PDO A MARIADB / MYSQL LOCAL
// ----------------------------------------------------------------------------
function getDbConnection(&$errorMsg = null) {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    if (empty(EB_DB_NAME)) {
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
// 3. AUTO-INSTALACIÓN DE TABLAS CANÓNICAS (IDEMPOTENTE - NUNCA BORRA DATOS)
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
    if (empty($secret)) {
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
// 6. ENRUTADOR DE ACCIONES (Compatible con Query Params y PATH_INFO de Angular)
// ----------------------------------------------------------------------------
$requestUri = $_SERVER['REQUEST_URI'] ?? '';
$pathInfo = $_SERVER['PATH_INFO'] ?? '';
$uriPath = parse_url($requestUri, PHP_URL_PATH) ?? '';

$route = '';
if (!empty($_GET['action'])) {
    $route = trim($_GET['action']);
} else if (!empty($pathInfo)) {
    $route = trim($pathInfo, '/');
} else if (preg_match('#/erp-bridge-endpoint\.php(?:/([^?]+))?#i', $uriPath, $m)) {
    $route = isset($m[1]) ? trim($m[1], '/') : '';
}

$routeParts = explode('/', $route);
$mainAction = strtolower($routeParts[0] ?? '');
$routeParam = $routeParts[1] ?? '';

if (empty($mainAction)) {
    $mainAction = ($_SERVER['REQUEST_METHOD'] === 'POST') ? 'create_order' : 'ping';
}

// ----------------------------------------------------------------------------
// RUTA PÚBLICA: PING / HEALTH
// ----------------------------------------------------------------------------
if ($mainAction === 'ping' || $mainAction === 'health') {
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
            'database' => EB_DB_NAME,
            'error' => $dbErr,
        ],
        'error' => $dbErr,
        'timestamp' => time(),
        'https' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443),
    ]);
    exit;
}

// ----------------------------------------------------------------------------
// RUTA PÚBLICA: TARIFAS (Compatible con RatesService de Angular)
// ----------------------------------------------------------------------------
if ($mainAction === 'rates') {
    echo json_encode([
        [
            'codtar' => 'INTERNET',
            'destar' => 'INTERNET',
            'martar' => '0',
            'ivatar' => '21',
            'diitar' => '0',
        ]
    ]);
    exit;
}

// ----------------------------------------------------------------------------
// RUTA PÚBLICA: SECCIONES (Compatible con SectionService de Angular)
// ----------------------------------------------------------------------------
if ($mainAction === 'secction' || $mainAction === 'sections') {
    $pdo = getDbConnection();
    if (!$pdo) {
        echo json_encode([]);
        exit;
    }
    ensureTablesExist($pdo);
    $stmt = $pdo->query("
        SELECT DISTINCT 
            section_code AS codsec, 
            COALESCE(section_name, section_code) AS dessec 
        FROM eb_products 
        WHERE section_code IS NOT NULL AND section_code != '' 
        ORDER BY section_code ASC
    ");
    $sections = $stmt->fetchAll();
    echo json_encode($sections);
    exit;
}

// ----------------------------------------------------------------------------
// RUTA PÚBLICA: FAMILIAS Y ARTÍCULOS POR FAMILIA (Compatible con FamilyService)
// ----------------------------------------------------------------------------
if ($mainAction === 'family' || $mainAction === 'families') {
    $pdo = getDbConnection();
    if (!$pdo) {
        echo json_encode([]);
        exit;
    }
    ensureTablesExist($pdo);

    $famId = !empty($routeParam) ? trim($routeParam) : (isset($_GET['id']) ? trim($_GET['id']) : (isset($_GET['famId']) ? trim($_GET['famId']) : ''));

    if (!empty($famId)) {
        // Artículos de una familia específica
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
        echo json_encode($stmt->fetchAll());
        exit;
    } else {
        // Listado de familias
        $stmt = $pdo->query("
            SELECT DISTINCT 
                family_code AS codfam, 
                COALESCE(family_name, family_code) AS desfam 
            FROM eb_products 
            WHERE family_code IS NOT NULL AND family_code != '' 
            ORDER BY family_code ASC
        ");
        echo json_encode($stmt->fetchAll());
        exit;
    }
}

// ----------------------------------------------------------------------------
// RUTA PÚBLICA: CATÁLOGO COMPLETO Y MEDIDAS (Compatible con DataService)
// ----------------------------------------------------------------------------
if ($mainAction === 'catalog' || $mainAction === 'articles') {
    $pdo = getDbConnection();
    if (!$pdo) {
        http_response_code(503);
        echo json_encode(['error' => 'Base de datos no disponible']);
        exit;
    }
    ensureTablesExist($pdo);

    // Búsqueda opcional
    $searchQuery = isset($_GET['query']) ? trim($_GET['query']) : '';
    $where = "WHERE p.active = 1";
    $params = [];
    if (!empty($searchQuery)) {
        $where .= " AND (p.name LIKE :q OR p.code LIKE :q OR p.barcode LIKE :q OR p.description LIKE :q)";
        $params[':q'] = '%' . $searchQuery . '%';
    }

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
            p.active,
            p.section_code,
            p.section_name,
            p.family_name,
            COALESCE(s.stock, 0) AS stock 
        FROM eb_products p 
        LEFT JOIN eb_stock s ON p.code = s.code 
        {$where}
        ORDER BY p.name ASC
    ");
    $stmt->execute($params);
    $items = $stmt->fetchAll();

    $stmtMeasures = $pdo->query("SELECT DISTINCT unit_of_measure FROM eb_products WHERE unit_of_measure IS NOT NULL AND unit_of_measure != ''");
    $rawMeasures = $stmtMeasures->fetchAll(PDO::FETCH_COLUMN) ?: ['UNIDADES'];
    $measures = [];
    foreach ($rawMeasures as $m) {
        $measures[] = ['desume' => $m];
    }

    if (!empty($searchQuery)) {
        // En búsqueda devuelve array directo de artículos
        echo json_encode($items);
    } else {
        echo json_encode(['success' => true, 'count' => count($items), 'articles' => $items, 'measures' => $measures]);
    }
    exit;
}

// ----------------------------------------------------------------------------
// RUTA PÚBLICA: MEDIDAS
// ----------------------------------------------------------------------------
if ($mainAction === 'measures') {
    $pdo = getDbConnection();
    if (!$pdo) {
        echo json_encode(['measures' => [['desume' => 'UNIDADES']]]);
        exit;
    }
    ensureTablesExist($pdo);
    $stmt = $pdo->query("SELECT DISTINCT unit_of_measure FROM eb_products WHERE unit_of_measure IS NOT NULL AND unit_of_measure != ''");
    $rawMeasures = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: ['UNIDADES'];
    $measures = [];
    foreach ($rawMeasures as $m) {
        $measures[] = ['desume' => $m];
    }
    echo json_encode(['measures' => $measures]);
    exit;
}

// ----------------------------------------------------------------------------
// RUTA PÚBLICA: CREACIÓN DE PEDIDOS (Checkout de la tienda)
// ----------------------------------------------------------------------------
if ($mainAction === 'create_order' || $mainAction === 'order') {
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

// ============================================================================
// ACCIONES PROTEGIDAS DEL AGENTE LOCAL (Requieren Secret Key)
// ============================================================================
verifyAuthentication();

// ----------------------------------------------------------------------------
// ACCIÓN PROTEGIDA: CHECK_IMAGES (Dirty-Checking de fotos existentes en hosting)
// ----------------------------------------------------------------------------
if ($mainAction === 'check_images') {
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
// ACCIÓN PROTEGIDA: UPLOAD_IMAGE (Subida directa de fotos por HTTPS)
// ----------------------------------------------------------------------------
if ($mainAction === 'upload_image') {
    $targetRelPath = isset($_GET['path']) ? trim($_GET['path']) : '';
    if (empty($targetRelPath) && isset($_SERVER['HTTP_X_FILE_PATH'])) {
        $targetRelPath = trim($_SERVER['HTTP_X_FILE_PATH']);
    }

    // Saneamiento de seguridad contra Directory Traversal
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
// ACCIÓN PROTEGIDA: PUSH_CATALOG (Subida masiva de productos desde Bentian Agent)
// ----------------------------------------------------------------------------
$pdo = getDbConnection();
if (!$pdo) {
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo conectar a MariaDB']);
    exit;
}
ensureTablesExist($pdo);

$rawBody = file_get_contents('php://input');
$data = json_decode($rawBody, true) ?: [];

if ($mainAction === 'push_catalog') {
    $products = isset($data['products']) && is_array($data['products']) ? $data['products'] : [];
    if (empty($products)) {
        echo json_encode(['success' => true, 'count' => 0, 'message' => 'No se enviaron productos']);
        exit;
    }

    $sql = "INSERT INTO `eb_products` 
      (`code`, `sku`, `name`, `description`, `section_code`, `section_name`, `family_code`, `family_name`, `price`, `sale_price`, `vat_rate`, `price_with_vat`, `sale_price_with_vat`, `unit_of_measure`, `weight`, `barcode`, `imgart`, `image_url`, `active`, `updated_at`)
    VALUES 
      (:code, :sku, :name, :description, :section_code, :section_name, :family_code, :family_name, :price, :sale_price, :vat_rate, :price_with_vat, :sale_price_with_vat, :unit_of_measure, :weight, :barcode, :imgart, :image_url, :active, NOW())
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
      `imgart` = IF(VALUES(`imgart`) != '', VALUES(`imgart`), `imgart`),
      `image_url` = IF(VALUES(`image_url`) != '', VALUES(`image_url`), `image_url`),
      `active` = VALUES(`active`),
      `updated_at` = NOW()";

    $stmt = $pdo->prepare($sql);
    $count = 0;

    $pdo->beginTransaction();
    try {
        foreach ($products as $p) {
            $sku = substr($p['sku'] ?? $p['code'] ?? '', 0, 50);
            $code = substr($p['code'] ?? $sku, 0, 50);
            if (empty($code)) continue;

            $regPrice = floatval($p['regularPrice'] ?? $p['price'] ?? 0);
            $rawSale = isset($p['salePrice']) ? floatval($p['salePrice']) : null;
            $vat = floatval($p['taxRate'] ?? $p['vat_rate'] ?? 21.0);
            $withVat = round($regPrice * (1 + $vat / 100), 4);
            $salePrice = ($rawSale !== null && $rawSale > 0 && $rawSale < $regPrice) ? $rawSale : null;
            $saleWithVat = $salePrice !== null ? round($salePrice * (1 + $vat / 100), 4) : null;

            // Normalización canónica de imagen con prefijo /
            $rawImg = '';
            if (!empty($p['imgart'])) {
                $rawImg = $p['imgart'];
            } else if (!empty($p['images']) && is_array($p['images']) && count($p['images']) > 0) {
                $first = $p['images'][0];
                $rawImg = is_array($first) ? ($first['src'] ?? '') : strval($first);
            }
            $cleanImg = '';
            if (!empty($rawImg)) {
                $cleanImg = str_replace('\\', '/', $rawImg);
                if (strpos($cleanImg, '/') !== 0 && !preg_match('#^https?://#i', $cleanImg)) {
                    $cleanImg = '/' . $cleanImg;
                }
            }

            $imgUrl = $p['imageUrl'] ?? $cleanImg;

            $stmt->execute([
                ':code' => $code,
                ':sku' => $sku,
                ':name' => substr($p['name'] ?? '', 0, 255),
                ':description' => $p['description'] ?? null,
                ':section_code' => substr($p['section_code'] ?? $p['sectionCode'] ?? '', 0, 10) ?: null,
                ':section_name' => substr($p['section_name'] ?? $p['sectionName'] ?? '', 0, 100) ?: null,
                ':family_code' => substr($p['family_code'] ?? $p['familyCode'] ?? '', 0, 10) ?: null,
                ':family_name' => substr($p['family_name'] ?? $p['familyName'] ?? '', 0, 100) ?: null,
                ':price' => $regPrice,
                ':sale_price' => $salePrice,
                ':vat_rate' => $vat,
                ':price_with_vat' => $withVat,
                ':sale_price_with_vat' => $saleWithVat,
                ':unit_of_measure' => substr($p['unitOfMeasure'] ?? 'UNIDADES', 0, 20),
                ':weight' => floatval($p['weight'] ?? 0),
                ':barcode' => substr($p['barcode'] ?? '', 0, 50) ?: null,
                ':imgart' => $cleanImg ?: null,
                ':image_url' => $imgUrl ?: null,
                ':active' => ($p['status'] ?? 'publish') === 'publish' ? 1 : 0,
            ]);
            $count++;
        }
        $pdo->commit();
        echo json_encode(['success' => true, 'count' => $count, 'message' => "Se actualizaron {$count} productos"]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Fallo al procesar lote de catálogo: ' . $e->getMessage()]);
    }
    exit;
}

// ----------------------------------------------------------------------------
// ACCIÓN PROTEGIDA: PUSH_STOCK (Actualización rápida de existencias)
// ----------------------------------------------------------------------------
if ($mainAction === 'push_stock') {
    $updates = isset($data['stockUpdates']) && is_array($data['stockUpdates']) ? $data['stockUpdates'] : [];
    if (empty($updates)) {
        echo json_encode(['success' => true, 'count' => 0, 'message' => 'No se enviaron existencias']);
        exit;
    }

    $stmt = $pdo->prepare("
        INSERT INTO `eb_stock` (`code`, `stock`, `updated_at`)
        VALUES (:code, :stock, NOW())
        ON DUPLICATE KEY UPDATE `stock` = VALUES(`stock`), `updated_at` = NOW()
    ");

    $count = 0;
    $pdo->beginTransaction();
    try {
        foreach ($updates as $u) {
            $code = substr($u['code'] ?? $u['sku'] ?? '', 0, 50);
            if (empty($code)) continue;
            $stmt->execute([
                ':code' => $code,
                ':stock' => floatval($u['stock'] ?? 0),
            ]);
            $count++;
        }
        $pdo->commit();
        echo json_encode(['success' => true, 'count' => $count]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Fallo al actualizar existencias: ' . $e->getMessage()]);
    }
    exit;
}

// ----------------------------------------------------------------------------
// ACCIÓN PROTEGIDA: PULL_ORDERS (Descarga de pedidos hacia Factusol)
// ----------------------------------------------------------------------------
if ($mainAction === 'pull_orders') {
    $limit = isset($_GET['limit']) ? max(1, min(100, intval($_GET['limit']))) : 50;
    $stmt = $pdo->prepare("SELECT * FROM `eb_orders` WHERE `status` = 'PENDING' ORDER BY `id` ASC LIMIT :lim");
    $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    $orders = [];
    foreach ($rows as $r) {
        $orders[] = [
            'id' => intval($r['id']),
            'order_number' => $r['order_number'],
            'status' => $r['status'],
            'customer' => json_decode($r['customer_data'], true) ?: [],
            'lines' => json_decode($r['order_lines'], true) ?: [],
            'payment_method' => $r['payment_method'],
            'total' => floatval($r['total']),
            'created_at' => $r['created_at'],
        ];
    }
    echo json_encode(['success' => true, 'orders' => $orders]);
    exit;
}

// ----------------------------------------------------------------------------
// ACCIÓN PROTEGIDA: ACK_ORDERS (Confirmación de pedidos descargados)
// ----------------------------------------------------------------------------
if ($mainAction === 'ack_orders') {
    $confirmations = isset($data['confirmations']) && is_array($data['confirmations']) ? $data['confirmations'] : [];
    $stmt = $pdo->prepare("
        UPDATE `eb_orders` 
        SET `status` = 'SYNCED', 
            `factusol_order_number` = :factNum, 
            `factusol_series` = :factSer, 
            `synced_at` = NOW() 
        WHERE `id` = :id
    ");

    $count = 0;
    $pdo->beginTransaction();
    try {
        foreach ($confirmations as $c) {
            $stmt->execute([
                ':id' => intval($c['orderId'] ?? 0),
                ':factNum' => intval($c['factusolOrderNumber'] ?? 0) ?: null,
                ':factSer' => substr($c['factusolSeries'] ?? 'A', 0, 5),
            ]);
            $count++;
        }
        $pdo->commit();
        echo json_encode(['success' => true, 'count' => $count]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Fallo al confirmar pedidos']);
    }
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Acción no válida: ' . htmlspecialchars($mainAction)]);
