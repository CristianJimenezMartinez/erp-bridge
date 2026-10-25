<?php
const FS_FOLDER = '/var/www/html';
require_once 'vendor/autoload.php';
require_once 'config.php';
\FacturaScripts\Core\Kernel::init();
\FacturaScripts\Core\Plugins::init();

$cliente = new \FacturaScripts\Dinamic\Model\Cliente();
if (!$cliente->load('1')) {
    echo "Cliente not found\n";
    exit(1);
}

$doc = new \FacturaScripts\Dinamic\Model\PedidoCliente();
$doc->setSubject($cliente);
$doc->setWarehouse('ALG');
$doc->codserie = 'A';
$doc->coddivisa = 'EUR';
$doc->codpago = 'CONT';
$doc->setDate(date('d-m-Y'), date('H:i:s'));

if (!$doc->save()) {
    echo "Doc save failed!\n";
    foreach (\FacturaScripts\Core\Tools::log()->read() as $log) {
        echo "LOG: " . json_encode($log) . "\n";
    }
} else {
    echo "Doc saved successfully! ID: " . $doc->idpedido . ", Codigo: " . $doc->codigo . "\n";
}
