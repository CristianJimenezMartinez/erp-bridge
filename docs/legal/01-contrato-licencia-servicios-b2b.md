# CONTRATO MERCANTIL DE LICENCIA DE SOFTWARE, INTEGRACIÓN Y SERVICIOS EN LA NUBE (B2B)

**CONTRATO Nº:** BNT-B2B-`[AÑO]`-`[NUMERO]`  
**CÓDIGO DE CLIENTE:** `[CLI-XXXX]`  
**FECHA DE ENTRADA EN VIGOR:** `[FECHA_FIRMA]`  

---

### REUNIDOS

**DE UNA PARTE (EL PRESTADOR / PROVEEDOR):**  
**D. CRISTIAN JIMÉNEZ MARTÍNEZ** (operando comercialmente bajo la marca registrada **BENTIAN ERP BRIDGE**), con NIF número `[NIF_PROVEEDOR]`, con domicilio profesional en `[DIRECCIÓN_COMPLETA_PROVEEDOR]`, España, y dirección de correo electrónico a efectos de notificaciones contractuales `soporte@cristianjm.com` (en adelante, el **"PROVEEDOR"** o **"BENTIAN"**).

**DE OTRA PARTE (EL CLIENTE / LICENCIATARIO):**  
La mercantil / entidad `[NOMBRE_O_RAZON_SOCIAL_CLIENTE]`, con NIF / CIF número `[CIF_CLIENTE]`, con domicilio social en `[DOMICILIO_SOCIAL_CLIENTE]`, debidamente representada en este acto por D./Dña. `[NOMBRE_REPRESENTANTE]`, con DNI/NIE número `[DNI_REPRESENTANTE]`, en su calidad de `[CARGO_REPRESENTANTE: Administrador Único / Apoderado / Gerente]` facultado para este acto según consta en escritura pública (en adelante, el **"CLIENTE"**).

El PROVEEDOR y el CLIENTE podrán ser denominados conjuntamente como las **"Partes"** e individualmente como la **"Parte"**.

---

### EXPONEN

**I.** Que el PROVEEDOR es legítimo titular de los derechos de explotación exclusiva de propiedad intelectual del software denominado **Bentian ERP Bridge** (compuesto por el software de escritorio para Windows "Bentian Local Agent", sus módulos conectores OLEDB y controladores de sincronización con plataformas de comercio electrónico).  
**II.** Que el CLIENTE opera una actividad empresarial mercantil, disponiendo en sus instalaciones o infraestructura de red local de una base de datos del software de gestión empresarial (ERP) **Factusol** (propiedad de Software DELSOL, S.A.), y de uno o varios canales de venta electrónica en internet (tales como tiendas WooCommerce, PrestaShop o plataforma propia conectada mediante el protocolo Universal Bridge).  
**III.** Que el CLIENTE está interesado en adquirir una licencia de uso del software Bentian ERP Bridge y contratar los servicios de sincronización continua y soporte técnico prestados por el PROVEEDOR, reconociendo el carácter estrictamente mercantil, profesional y B2B de esta contratación.  
**IV.** Que ambas Partes, reconociéndose recíprocamente plena capacidad legal y de obrar para el otorgamiento del presente Contrato, convienen en suscribir el mismo con arreglo a las siguientes:

---

### CLÁUSULAS

#### 1. OBJETO DEL CONTRATO
1.1. El PROVEEDOR otorga al CLIENTE, y éste acepta, una **licencia de uso de software no exclusiva, intransferible, revocable y limitada en el tiempo**, sujeta a la vigencia y pago puntual de la suscripción contratada, respecto al software **Bentian ERP Bridge Local Agent**.  
1.2. El Software tiene por objeto exclusivo la lectura automatizada de existencias (stock) y catálogo de productos desde la base de datos local de Factusol del CLIENTE y su transmisión cifrada hacia su tienda electrónica, así como la descarga y registro estructurado de los pedidos web generados por los clientes del CLIENTE en las tablas de pedidos de clientes (`F_PCL`) de Factusol.  
1.3. La licencia autoriza la instalación y ejecución del Software en **un (1) único equipo o servidor informático** vinculado a un identificador criptográfico único de hardware (**HWID**), para gestionar una (1) base de datos de empresa de Factusol (`.accdb` / `.mdb`). Puestos, servidores o empresas adicionales requerirán la contratación expresa de licencias complementarias.

---

#### 2. ARQUITECTURA TÉCNICA "LOCAL-FIRST" Y CONFIDENCIALIDAD
2.1. El CLIENTE reconoce y declara conocer que el Software opera bajo la arquitectura tecnológica **Local-First (procesamiento exclusivo en el equipo local del CLIENTE)**. Toda la extracción, mapeo, transformación y preparación de datos contables, comerciales y de inventario se ejecuta directamente en la memoria y procesador del equipo donde el CLIENTE instala el agente.  
2.2. **Principio de No Custodia Cloud:** Los servidores centrales en la nube del PROVEEDOR **NO almacenan, no intermedian, no indexan ni realizan copias de seguridad de las bases de datos de clientes, facturas, cobros ni datos personales del CLIENTE**. La sincronización viaja cifrada de extremo a extremo mediante protocolo seguro HTTPS (TLS 1.3) directamente desde el equipo local del CLIENTE hacia el servidor de su tienda online.  
2.3. La nube del PROVEEDOR procesa únicamente metadatos esenciales de telemetría operativa (estado de conexión del agente, consumo de recursos, versión instalada, recuento de referencias y validación de tokens criptográficos de licencia).

---

#### 3. CONDICIONES ECONÓMICAS, FACTURACIÓN Y PAGO
3.1. **Tarifas y Modalidad:** El CLIENTE abonará al PROVEEDOR la contraprestación económica correspondiente al Plan contratado:
- **Plan Starter / Business:** `[IMPORTE_NETO]` € / `[año / mes]` + IVA aplicable (21% en España o exención intracomunitaria VIES).
- **Puestos adicionales (si aplica):** `[IMPORTE_PUESTOS]` € / puesto / año.  
3.2. **Forma de Pago:** El pago se realizará de forma recurrente y automatizada mediante tarjeta de crédito/débito o domiciliación a través de la pasarela de pagos certificada **Stripe**, o mediante transferencia bancaria anticipada si así se ha convenido expresamente por escrito.  
3.3. **Emisión de Factura Fiscal:** El PROVEEDOR emitirá y pondrá a disposición del CLIENTE la preceptiva factura fiscal electrónica por cada cargo efectuado, accesible a través del Portal de Facturación de Cliente.  
3.4. **Suspensión por Impago:** La falta de pago de cualquier cuota a su vencimiento conllevará, previo aviso telemático, la suspensión temporal del servicio de sincronización transcurridos cinco (5) días hábiles desde el intento de cobro fallido. Si transcurridos quince (15) días no se ha regularizado el pago, el PROVEEDOR podrá resolver el contrato y revocar la licencia de forma definitiva.

---

#### 4. OBLIGACIÓN IMPERATIVA DE COPIAS DE SEGURIDAD (BACKUPS) Y EXONERACIÓN DE RESPONSABILIDAD DE LA BASE DE DATOS
4.1. **Naturaleza de Microsoft Access:** El CLIENTE reconoce expresamente que las bases de datos de Factusol utilizan tecnología Microsoft Access (`.accdb` / `.mdb`), cuyo motor de ficheros es sensible a caídas de tensión eléctrica, microcortes de red local (LAN/Wi-Fi), bloqueos de antivirus o apagados forzados del sistema operativo.  
4.2. **Obligación Ineludible del CLIENTE:** Es **obligación exclusiva, imperativa y previa del CLIENTE realizar y mantener copias de seguridad (backups) completas, diarias e independientes** de todos sus archivos de datos de Factusol, comprobando periódicamente la restaurabilidad de las mismas.  
4.3. **Exoneración de Responsabilidad:** El PROVEEDOR **NO será responsable bajo ninguna circunstancia** de:
- Corrupción de tablas o índices en la base de datos de Factusol ocasionada por cortes de suministro eléctrico, caídas de red, reinicios del sistema operativo, fallos de disco duro o interferencias de software antivirus/EDR en el equipo del CLIENTE.
- Bloqueos de concurrencia transitorios generados por usuarios que abran Factusol de forma exclusiva o con permisos insuficientes en la red.
- Manipulaciones directas de la base de datos realizadas por el personal del CLIENTE o por terceros ajenos al PROVEEDOR.
- Incompatibilidades sobrevenidas debidas a actualizaciones no soportadas del ERP Factusol o modificaciones arbitrarias en el esquema relacional de datos.

---

#### 5. CUMPLIMIENTO DE LA LEY ANTIFRAUDE Y NORMATIVA VERI*FACTU
5.1. **Carácter del Software:** Conforme a la **Ley 11/2021, de 9 de julio, de Medidas de Prevención y Lucha contra el Fraude Fiscal**, el **Real Decreto 1007/2023** (Reglamento de Requisitos de Sistemas Informáticos de Facturación - SIF) y la **Orden Ministerial HAC/1177/2024**, el software Bentian ERP Bridge tiene la consideración exclusiva de **herramienta de transporte e integración de pedidos comerciales (`F_PCL`) y catálogo de artículos**, y **NO constituye un software de facturación de doble uso ni un sistema de ocultación o alteración de ventas**.  
5.2. **Responsabilidad Fiscal Exclusiva del CLIENTE:** El CLIENTE declara y asume que es el único y exclusivo responsable del cumplimiento de sus obligaciones tributarias ante la Agencia Estatal de Administración Tributaria (AEAT) o haciendas forales, correspondiendo íntegramente al CLIENTE y a su software ERP Factusol la emisión de facturas definitivas (`F_FAC`), la aplicación de los tipos de IVA e IRPF, la generación del encadenamiento criptográfico (hash SHA-256) de Veri*Factu y la remisión telemática de registros de facturación cuando resulte preceptivo por ley.  
5.3. El PROVEEDOR no asesora fiscalmente al CLIENTE ni responderá de sanciones, liquidaciones complementarias, intereses de demora ni multas impuestas por la Administración Tributaria derivadas de la actividad comercial o facturación del CLIENTE.

---

#### 6. PROPIEDAD INTELECTUAL Y PROHIBICIÓN DE INGENIERÍA INVERSA
6.1. Todos los derechos de propiedad intelectual, derechos de autor, código fuente, algoritmos, binarios ejecutables, marcas, secretos comerciales, manuales y diseños de Bentian ERP Bridge son de titularidad exclusiva de **Cristian Jiménez Martínez**, protegidos por el Real Decreto Legislativo 1/1996 (TRLPI), la Ley 1/2019 de Secretos Empresariales y los convenios internacionales.  
6.2. El CLIENTE no adquiere ningún derecho de propiedad sobre el Software, salvo la mera licencia de uso temporal expresamente conferida.  
6.3. **Queda terminantemente prohibido al CLIENTE, a su personal y a terceros subcontratados:**
- Descompilar, desensamblar, aplicar técnicas de ingeniería inversa o intentar descifrar el código fuente, la lógica interna o los protocolos cifrados del Software.
- Alterar, parchear o eludir los mecanismos de verificación de licencias criptográficas o vinculación de hardware (HWID).
- Sublicenciar, revender, arrendar o poner a disposición de terceros el Software.
- Utilizar el Software o la información técnica derivada del mismo para el desarrollo de un producto o servicio competidor.  
6.4. El incumplimiento de esta cláusula facultará al PROVEEDOR a la revocación inmediata de la licencia sin derecho a reembolso y a exigir una indemnización en concepto de cláusula penal de **CINCUENTA MIL EUROS (50.000,00 €)**, sin perjuicio de la reclamación de mayores daños y perjuicios y del ejercicio de las acciones penales que correspondan.

---

#### 7. ACUERDO DE NIVEL DE SERVICIO (SLA) Y SOPORTE TÉCNICO
7.1. **Soporte Incluido:** Mientras mantenga activa su suscripción, el CLIENTE tendrá derecho a:
- Soporte técnico estándar de nivel 2 por correo electrónico (`soporte@cristianjm.com`) o panel de tickets con tiempo de primera respuesta inferior a veinticuatro (24) horas hábiles (Lunes a Viernes de 9:00 a 18:00 h, horario peninsular español).
- Acceso gratuito a todas las actualizaciones periódicas, parches de seguridad y mejoras evolutivas de la versión del agente.  
7.2. **Exclusiones del Soporte:** El soporte no incluye la reparación de ordenadores o servidores del CLIENTE, limpieza de virus, configuración de routers o redes locales, reparación de archivos dañados de Factusol ni desarrollos a medida ajenos al producto estándar.

---

#### 8. LIMITACIÓN GENERAL Y MÁXIMA DE RESPONSABILIDAD
8.1. En la máxima medida permitida por el Código de Comercio y la legislación aplicable, el PROVEEDOR **NO será responsable frente al CLIENTE ni frente a terceros por daños indirectos, especiales, punitivos, incidentales o consecuenciales, lucro cesante, pérdida de ingresos, interrupción de la actividad mercantil, pérdida de clientela o daño reputacional**, cualquiera que sea la causa que lo origine.  
8.2. **Límite Económico Tasado:** La responsabilidad económica total y acumulada del PROVEEDOR frente al CLIENTE por cualquier incumplimiento contractual, extracontractual o negligencia derivada del presente Contrato quedará **estrictamente limitada, en todo caso y bajo cualquier supuesto, a la cantidad total efectivamente satisfecha por el CLIENTE al PROVEEDOR en los tres (3) meses inmediatamente anteriores** a la fecha en que se hubiera originado el hecho causante de la reclamación (o al 50% de la cuota anual si el pago fue anual).

---

#### 9. DURACIÓN, RENOVACIÓN Y RESOLUCIÓN
9.1. **Entrada en Vigor y Duración:** El presente Contrato entrará en vigor en la fecha de su firma o en la fecha de activación de la licencia tras el pago inicial, y tendrá una duración de **un (1) año**, prorrogándose tácita y automáticamente por períodos sucesivos de igual duración, salvo que cualquiera de las Partes notifique por escrito su voluntad de no renovación con al menos quince (15) días de antelación al término del período vigente.  
9.2. **Resolución:** Serán causas de resolución anticipada del Contrato:
- El mutuo acuerdo de las Partes por escrito.
- El impago de las cuotas transcurrido el plazo concedido en la Cláusula 3.4.
- El incumplimiento grave de cualquiera de las obligaciones del Contrato no subsanado en el plazo de diez (10) días naturales tras requerimiento formal.
- La vulneración de los derechos de propiedad intelectual, confidencialidad o ingeniería inversa (Cláusula 6).  
9.3. A la terminación del Contrato por cualquier causa, la licencia quedará extinguida de pleno derecho, debiendo el CLIENTE desinstalar y cesar de inmediato en el uso del Software.

---

#### 10. PROTECCIÓN DE DATOS PERSONALES (RGPD)
Las Partes formalizan en el **ANEXO I** del presente documento el preceptivo **Acuerdo de Encargo de Tratamiento de Datos** conforme a lo dispuesto en el artículo 28 del Reglamento General de Protección de Datos (RGPD) y en la LOPDGDD 3/2018, el cual forma parte integrante e inseparable de este Contrato a todos los efectos legales.

---

#### 11. LEY APLICABLE Y JURISDICCIÓN
11.1. El presente Contrato tiene carácter mercantil y se rige en todos sus extremos por la legislación española común.  
11.2. Ambas Partes, con renuncia expresa a cualquier otro fuero o jurisdicción que pudiera corresponderles en atención a sus domicilios presentes o futuros, se someten de manera expresa e irrevocable a la jurisdicción y competencia exclusiva de los **Juzgados y Tribunales de la ciudad de Murcia (España)** para la resolución de cualquier controversia, conflicto o reclamación derivada de la interpretación, validez, ejecución o resolución del presente Contrato.

---

### Y EN PRUEBA DE CONFORMIDAD
Ambas Partes suscriben el presente Contrato mercantil por duplicado ejemplar y a un solo efecto, mediante firma manuscrita o mediante sistema de firma electrónica avanzada reconocido (conforme al Reglamento eIDAS), en el lugar y fecha indicados en el encabezamiento.

| POR EL PROVEEDOR (BENTIAN): | POR EL CLIENTE: |
| :--- | :--- |
| **Fdo.: D. Cristian Jiménez Martínez** | **Fdo.: D./Dña. `[NOMBRE_REPRESENTANTE]`** |
| Titular de Bentian ERP Bridge | Cargo: `[CARGO_REPRESENTANTE]` |
| NIF: `[NIF_PROVEEDOR]` | En representación de: `[RAZON_SOCIAL_CLIENTE]` |
| | CIF: `[CIF_CLIENTE]` |
| *(Firma y Sello)* | *(Firma y Sello)* |

---
---

# ANEXO I: ACUERDO DE ENCARGO DE TRATAMIENTO DE DATOS PERSONALES (RGPD ART. 28)

En cumplimiento de lo exigido por el **Artículo 28 del Reglamento (UE) 2016/679 (RGPD)** y el **Artículo 33 de la Ley Orgánica 3/2018 (LOPDGDD)**, las Partes suscriben el presente anexo que regula el tratamiento de datos de carácter personal derivado de la ejecución de la licencia de software Bentian ERP Bridge:

### 1. CONDICIÓN DE LAS PARTES
- **EL CLIENTE** ostenta la condición legal de **RESPONSABLE DEL TRATAMIENTO** respecto a los datos de carácter personal de sus propios clientes, compradores y contactos comerciales almacenados en su ERP Factusol y en su tienda online.
- **EL PROVEEDOR (BENTIAN)** ostenta la condición de **ENCARGADO DEL TRATAMIENTO** en la estricta medida en que el software desarrollado interactúa con dichos sistemas con fines exclusivos de sincronización técnica.

### 2. NATURALEZA Y ARQUITECTURA "LOCAL-FIRST" (AUSENCIA DE CUSTODIA EN NUBE)
El RESPONSABLE reconoce y certifica que la arquitectura técnica del Software se basa en el principio de **Privacidad desde el Diseño y por Defecto (Art. 25 RGPD)**:
1. El Software se ejecuta **localmente en el equipo del RESPONSABLE**. La extracción y lectura de datos de clientes para la creación de pedidos en Factusol (`F_PCL`) y el mapeo de stock se realiza en la memoria local del equipo del RESPONSABLE.
2. Los datos de pedidos y clientes son transmitidos directamente por el equipo del RESPONSABLE a su propia tienda online mediante conexión cifrada punto a punto (TLS / HTTPS).
3. **El ENCARGADO (BENTIAN) NO custodia, no almacena en servidores centrales, no copia, no indexa ni transfiere a terceros bases de datos que contengan datos de carácter personal de los clientes finales del RESPONSABLE**. Los servidores de telemetría de Bentian únicamente procesan registros técnicos de diagnóstico (dirección IP de conexión del agente, identificador HWID, timestamp de sincronización y número agregado de transacciones).

### 3. OBLIGACIONES DEL ENCARGADO DEL TRATAMIENTO
En la medida accesoria en que el ENCARGADO pudiera tener acceso incidental a datos personales con ocasión de la prestación de servicios de soporte técnico remoto solicitados expresamente por el RESPONSABLE, el ENCARGADO se compromete a:
1. **Instrucciones del Responsable:** Tratar los datos únicamente siguiendo las instrucciones documentadas del RESPONSABLE y con la única finalidad de prestar el soporte y mantenimiento contratado.
2. **Deber de Secreto:** Garantizar que todo el personal autorizado que intervenga en el soporte esté sujeto a una estricta obligación formal de confidencialidad y secreto profesional.
3. **Medidas de Seguridad:** Aplicar las medidas técnicas y organizativas apropiadas para garantizar un nivel de seguridad adecuado al riesgo (Art. 32 RGPD), tales como comunicaciones cifradas TLS 1.3, autenticación robusta y principio de mínimo privilegio.
4. **Subencargados:** El RESPONSABLE autoriza con carácter general la contratación de los siguientes proveedores tecnológicos auxiliares necesarios para la operativa del servicio:
   - Proveedor de pasarela de pagos segura y facturación: **Stripe Payments Europe, Ltd.** (certificación PCI-DSS Nivel 1).
   - Proveedor de infraestructura cloud / API: Servidores en territorio de la Unión Europea (Alemania / Francia / España) cumpliendo el RGPD.
5. **Brechas de Seguridad:** En caso de que se detecte un incidente de seguridad que afecte a los datos personales en el entorno del servicio, el ENCARGADO notificará al RESPONSABLE sin dilación indebida y, a más tardar, en un plazo de cuarenta y ocho (48) horas tras haber tenido constancia.
6. **Destrucción o Devolución:** A la finalización de los servicios de soporte, el ENCARGADO no conservará copia alguna de los datos personales a los que hubiera podido tener acceso temporal, procediendo a su borrado seguro.

### 4. OBLIGACIONES DEL RESPONSABLE DEL TRATAMIENTO
Corresponde en todo caso al CLIENTE (RESPONSABLE):
1. Disponer de la base jurídica legitimadora (consentimiento o ejecución del contrato de compraventa mercantil) para el tratamiento de los datos personales de sus clientes web.
2. Cumplir con los deberes de información a los interesados conforme a los artículos 13 y 14 del RGPD en su tienda online.
3. Mantener actualizadas las copias de seguridad y la seguridad física y lógica del ordenador o servidor donde reside la base de datos de Factusol.

---
---

# ANEXO II: DECLARACIÓN DE CONFORMIDAD TÉCNICA - LEY ANTIFRAUDE Y VERI*FACTU

**DECLARANTE:**  
D. Cristian Jiménez Martínez, en calidad de autor y desarrollador del software **Bentian ERP Bridge**.

**DECLARA BAJO SU RESPONSABILIDAD:**

1. Que el software **Bentian ERP Bridge** (en su versión actual v0.3.x) ha sido diseñado con pleno respeto a los principios de **integridad, trazabilidad, inalterabilidad y conservación** exigidos por el artículo 29.2.j) de la Ley 58/2003, General Tributaria, introducido por la **Ley 11/2021, de 9 de julio, de Medidas de Prevención y Lucha contra el Fraude Fiscal**.
2. Que el Software **NO constituye un Sistema Informático de Facturación (SIF) de doble uso**, careciendo de funcionalidades dirigidas a:
   - Llevar contabilidades distintas o paralelas referidas a una misma actividad.
   - Omitir o desfigurar el registro de operaciones realizadas.
   - Permitir transacciones sin anotación contable preceptiva.
   - Alterar o destruir asientos ya registrados sin la correspondiente huella o contrapartida.
3. Que la operativa técnica de Bentian ERP Bridge se limita exclusivamente a actuar como **conector bidireccional de catálogo comercial y pedidos de venta de clientes (`F_PCL`)**, dejando intacta la potestad y soberanía del software Factusol del usuario para la posterior emisión de facturas oficiales (`F_FAC`), generación de los registros de alta con huella criptográfica SHA-256 (Veri*factu), código QR y remisión obligatoria a la Sede Electrónica de la Agencia Tributaria.
