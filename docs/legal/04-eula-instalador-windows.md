# CONTRATO DE LICENCIA DE USUARIO FINAL (EULA) — BENTIAN LOCAL AGENT

**Documento integrado en el Instalador oficial de Windows (`BentianSetup.exe`)**  
*(c) 2026 Cristian Jiménez Martínez (Bentian ERP Bridge). Todos los derechos reservados.*

---

> **AVISO LEGAL OBLIGATORIO:**  
> AL MARCAR LA CASILLA *"ACEPTO EL ACUERDO DE LICENCIA"* Y COMPLETAR LA INSTALACIÓN DE **BENTIAN LOCAL AGENT**, EL USUARIO O SU REPRESENTANTE LEGAL DECLARAN HABER LEÍDO ÍNTEGRAMENTE ESTE CONTRATO Y ACEPTAN QUEDAR VINCULADOS POR TODOS SUS TÉRMINOS Y CONDICIONES EN EL EJERCICIO DE SU ACTIVIDAD EMPRESARIAL O PROFESIONAL (B2B).

---

### 1. Concesión de Licencia Limitada y Puestos
1. **Titularidad:** El software Bentian Local Agent y todas sus marcas, logos y algoritmos son propiedad exclusiva de D. Cristian Jiménez Martínez.
2. **Alcance:** Se otorga una licencia de uso de software mercantil, no exclusiva, revocable, intransferible y sujeta a suscripción activa de pago.
3. **Puestos:** La licencia estándar autoriza la instalación y ejecución en un (1) único equipo o servidor informático (físico o virtual) vinculado a un identificador criptográfico único de hardware (HWID) para gestionar una (1) base de datos de Factusol.

---

### 2. Protección de Propiedad Intelectual e Ingeniería Inversa
El Software está protegido por la Ley 1/2019 de Secretos Empresariales, el Real Decreto Legislativo 1/1996 (TRLPI) y el Código Penal español.  
Queda terminantemente prohibido al Usuario y a terceros:
1. Descompilar, desensamblar o aplicar ingeniería inversa al binario `BentianAgent.exe`, `BentianTray.exe` o a los drivers OLEDB.
2. Neutralizar, manipular o intentar eludir los tokens criptográficos de licencia HMAC-SHA256, las firmas digitales Ed25519 o los controles de integridad.
3. Crear software competidor, adaptadores derivados o clonar la arquitectura de integración.
4. Sublicenciar, revender, arrendar o compartir la clave de activación con terceros no autorizados.

---

### 3. Exoneración de Responsabilidad y Obligación Ineludible de Backups
1. **Naturaleza de Factusol y Microsoft Access:** El Usuario reconoce que las bases de datos de Factusol operan sobre archivos de Microsoft Access (`.accdb` / `.mdb`), que pueden sufrir bloqueos de concurrencia o corrupciones de índices ante cortes de luz, caídas de red, reinicios de Windows o fallos de disco local.
2. **Obligación de Copias de Seguridad:** **ES OBLIGACIÓN CONTRACTUAL DEL USUARIO MANTENER COPIAS DE SEGURIDAD (BACKUPS) DIARIAS E INDEPENDIENTES DE TODAS SUS BASES DE DATOS FACTUSOL**.
3. **Exoneración Total:** Bentian NO responderá bajo ninguna circunstancia de la pérdida o corrupción de datos, caídas de ventas, lucro cesante o paradas operativas provocadas por bloqueos de Access, caídas de la red del cliente o fallos de su hardware.

---

### 4. Cumplimiento Tributario y Veri*Factu (Ley 11/2021)
1. Bentian Local Agent es exclusivamente un puente de sincronización logística de catálogo y pedidos comerciales (`F_PCL`).
2. El Software **NO emite facturas finales ni constituye un Sistema Informático de Facturación (SIF) de doble uso**.
3. El Usuario es el único sujeto obligado tributario responsable de emitir sus facturas con el encadenamiento hash y código QR de Veri*Factu exigido por la Agencia Estatal de Administración Tributaria (AEAT) a través de su ERP Factusol.

---

### 5. Arquitectura "Local-First" y Privacidad (RGPD)
1. Toda la sincronización se realiza en local, transmitiéndose de forma directa y cifrada (TLS 1.3) a la tienda web del Usuario.
2. **Bentian NO almacena, no custodia ni tiene acceso en sus servidores centrales a las bases de datos fiscales, comerciales ni de clientes del Usuario**.

---

### 6. Límite Cuantitativo de Responsabilidad
La responsabilidad máxima total y acumulada de Bentian frente al Usuario por cualquier concepto quedará estrictamente limitada al importe efectivamente abonado por el Usuario en los **tres (3) meses anteriores** al hecho causante.

---

### 7. Ley Aplicable y Jurisdicción
Este contrato se rige por la legislación española. Ambas partes se someten a la jurisdicción exclusiva de los **Juzgados y Tribunales de la ciudad de Murcia (España)**, con renuncia a cualquier otro fuero.
