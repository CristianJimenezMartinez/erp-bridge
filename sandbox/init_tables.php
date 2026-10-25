<?php
const FS_FOLDER = '/var/www/html';
require_once 'vendor/autoload.php';
require_once 'config.php';
\FacturaScripts\Core\Kernel::init();
\FacturaScripts\Core\Plugins::init();

$tables = glob('/var/www/html/Core/Table/*.xml');
foreach ($tables as $f) {
    $t = basename($f, '.xml');
    $ok = \FacturaScripts\Core\DbUpdater::createOrUpdateTable($t);
    echo $t . ': ' . ($ok ? 'OK' : 'ERR ' . \FacturaScripts\Core\DbUpdater::getLastError()) . PHP_EOL;
}
