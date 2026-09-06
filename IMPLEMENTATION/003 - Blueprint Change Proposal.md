# 003 - Blueprint Change Proposal

## Estado

**Tipo:** Propuesta de cambio arquitectónico y estratégico
**Origen:** Integración del documento `504 - Market Validation.md`
**Estado:** Propuesta para revisión y aprobación
**Fecha:** 2026-09-01
**Autor:** Cristian / Antigravity

---

# 1. Resumen Ejecutivo

El documento **`504 - Market Validation.md`** introduce decisiones estratégicas y arquitectónicas fundamentales que refinan el rumbo de ERP Bridge:

1. **Estrategia de entrada vertical:** Visión horizontal a largo plazo, pero entrada vertical e hiperenfocada en **Factusol ↔ WooCommerce**.
2. **El Local Agent NO es obligatorio por definición:** Es una estrategia de acceso que pertenece al Connector (reservada para software local, bases de datos locales y legacy), mientras que sistemas cloud usan API directa.
3. **Uso prioritario de APIs oficiales:** El Connector de Factusol debe usar la API oficial cuando sea suficiente, y el acceso local/ODBC/Agent cuando sea técnicamente necesario.
4. **Propuesta de valor y diferenciación:** *"No solamente mover datos. Mantener la integración funcionando"* (operabilidad, diagnóstico, idempotencia, reintentos y reconciliación).
5. **No competir frontalmente con Zapier, Make o n8n:** Evitar la trampa de la amplitud horizontal prematura.
6. **Validación comercial estricta con pago:** Un piloto gratuito no valida el modelo; la validación exige que la empresa pague (hipótesis: Setup 150–500 € + 49–99 €/mes).
7. **Regla de expansión:** No construir múltiples conectores antes de validar y estabilizar el primero con clientes reales.

Este documento analiza las contradicciones existentes en el Blueprint actual, identifica los documentos impactados y formula los cambios textuales y conceptuales recomendados.

> **IMPORTANTE:** Ningún documento del Blueprint ha sido modificado. Esta propuesta espera revisión y aprobación explícita.

---

# 2. Contradicciones Encontradas

A continuación se detallan las fricciones y contradicciones detectadas entre `504 - Market Validation` y los 10 documentos analizados:

### 2.1 Contradicción sobre la obligatoriedad del Local Agent
* **En el Blueprint actual:**
  * `301 - System Overview §3 y §6`: Muestran esquemas donde todo ERP local o remoto pasa forzosamente a través del Local Agent.
  * `303 - Agent §1 y §25`: Puede inducir a pensar que ERP Bridge siempre requiere un agente instalado para cualquier flujo.
  * `106 - Use Cases §13`: El diagrama sitúa al Agente como el único canal de comunicación hacia ERP Bridge Cloud.
* **En `504 - Market Validation §6`:**
  * Se establece explícitamente: *"El Local Agent NO será obligatorio por definición. ERP Bridge debe seleccionar el mecanismo de conexión adecuado según las capacidades del sistema externo (API REST/SOAP cloud, Local Agent para ODBC/legacy, o conexión directa a base de datos). La decisión pertenece al Connector; el Core permanece independiente."*

### 2.2 Contradicción sobre el alcance de conectores en el MVP
* **En el Blueprint actual:**
  * `304 - Connectors §24`: Fija como conectores del MVP: *1. Factusol, 2. WooCommerce, 3. Tercer conector*.
  * `104 - Product Scope §7`: Habla de *"primeros conectores"* en plural.
  * `106 - Use Cases §18`: Otorga prioridad ⭐⭐⭐⭐⭐ a *"Nuevos conectores"* en la columna MVP.
* **En `504 - Market Validation §1, §12 y §17`:**
  * El MVP comercial y técnico es **estrictamente Factusol ↔ WooCommerce**. No se construirá un tercer conector hasta que el primero esté validado con 3–5 clientes de pago y soporte bajo.

### 2.3 Contradicción sobre la validación comercial (Gratuito vs. Pago)
* **En el Blueprint actual:**
  * `501 - MVP §40`: *"El MVP podrá utilizarse inicialmente: Free para conseguir usuarios y feedback."*
  * `201 - Business Model §16`: Habla de un *"núcleo de entrada accesible/gratuito"* como hipótesis principal.
* **En `504 - Market Validation §15 y §16`:**
  * Se prohíbe considerar validado el producto porque alguien diga que "parece interesante" o lo use gratis.
  * Señal de validación: *"Una empresa entrega acceso y paga para utilizarlo."*
  * Hipótesis de precio: Setup (150 – 500 €) + Mensualidad (49 – 99 €/mes).

### 2.4 Tensión en el posicionamiento ("Ahora" vs. "Visión a 10 años")
* **En el Blueprint actual:**
  * `101 - Vision §7`: Presenta el esquema *"AHORA: ERP → ERP Bridge → Ecommerce / CRM / IA / Logística / Otros sistemas"*.
* **En `504 - Market Validation §1, §8 y §10`:**
  * El *"AHORA"* no puede ser CRM, IA ni logística. El posicionamiento inicial no es una plataforma universal ni *"el nuevo Zapier"*, sino: *"Conecta tu ERP con tus canales digitales sin cambiar de software"*.

### 2.5 Ausencia de la "Reconciliación básica" como capacidad de primer nivel
* **En el Blueprint actual:**
  * `310 - Synchronization`: Describe sincronización delta, polling y resolución de conflictos, pero no eleva la **reconciliación** (detección periódica de discrepancias silenciosas entre sistemas) como funcionalidad nuclear.
* **En `504 - Market Validation §5, §9 y §13`:**
  * La **reconciliación básica** se define como pilar de la diferenciación y del MVP técnico (*"No solamente mover datos. Mantener la integración funcionando"*).

### 2.6 Estrategia de acceso a Factusol (API oficial vs. ODBC directo)
* **En el Blueprint actual:**
  * `304 - Connectors §15` y `501 - MVP §4`: Asumen acceso exclusivo mediante base de datos Access (`.accdb`) vía ODBC con el Agente.
  * No contemplan explícitamente el uso de la API oficial del fabricante si estuviera disponible.
* **En `504 - Market Validation §7`:**
  * Se dicta: *"El Connector de Factusol debe utilizar la API oficial cuando ésta cubra adecuadamente una operación. El Local Agent o acceso local se utilizará cuando sea técnicamente necesario."*

---

# 3. Documentos que Deben Modificarse

Para restaurar la coherencia absoluta del Blueprint, se propone actualizar los siguientes **10 documentos**:

| Documento | Nivel de Cambio | Motivo Principal |
|---|:---:|---|
| **101 - Vision** | Menor | Clarificar que el estado "AHORA" es la entrada vertical Factusol ↔ WooCommerce; CRM/IA/Logística son futuro. |
| **104 - Product Scope** | Menor | Eliminar menciones a múltiples conectores en MVP; fijar Agent como mecanismo opcional según sistema. |
| **106 - Use Cases** | Moderado | En §18 cambiar prioridad de "Nuevos conectores" en MVP; actualizar §13 para reflejar que Agent solo aplica a sistemas locales. |
| **201 - Business Model** | Moderado | Incorporar el precio experimental de `504 §16` (Setup + mensualidad) y la exigencia de clientes de pago para validación. |
| **301 - System Overview** | Moderado | Desacoplar el Core de la obligatoriedad del Agent; reflejar los 3 mecanismos de conexión (API Cloud, Local Agent, Direct DB). |
| **303 - Agent** | Menor | Aclarar en §1 y §6 que el Agent no es obligatorio para todos los conectores, sino una estrategia para entornos locales/legacy. |
| **304 - Connectors** | Moderado | Eliminar el "tercer conector" del MVP en §24; añadir soporte para múltiples estrategias de acceso (API oficial primero, Agent local cuando sea necesario). |
| **310 - Synchronization** | Moderado | Añadir la sección de **Reconciliación Básica** como capacidad explícita del motor de sincronización. |
| **501 - MVP** | Sustancial | Alinear §38 y §40 con validación mediante pago; retirar tercer conector; recalcar diferenciación en operabilidad y reconciliación. |
| **502 - v1** | Menor | Añadir criterio de expansión condicionada: solo avanzar a v1 tras validar Factusol ↔ Woo con 3–5 clientes de pago. |

---

# 4. Cambios Concretos Recomendados (Documento por Documento)

### 4.1 `101 - Vision`
* **Sección 7 (Esquema de Evolución):**
  * *Modificar:* Cambiar el bloque `AHORA` para que no prometa CRM, IA y logística simultáneamente:
    ```text
    AHORA (Entrada Vertical):
    Factusol → ERP Bridge → WooCommerce

    SIGUIENTE (Plataforma v1):
    ERP → ERP Bridge → Ecommerce / CRM / Servicios

    VISIÓN (A largo plazo):
    Todos los sistemas de la empresa → ERP Bridge → Automatización + IA
    ```
* **Sección 4 (Diferenciación):**
  * Añadir el lema de `504 §9`: *"No solamente mover datos. Mantener la integración funcionando (operabilidad, diagnóstico y reconciliación)."*

### 4.2 `104 - Product Scope`
* **Sección 7 (El MVP incluirá):**
  * Cambiar *"Primeros conectores"* por *"Conectores del MVP: Factusol y WooCommerce"*.
  * Añadir: *"Un sistema de conexión local (Local Agent) cuando el sistema conectado lo requiera."*
* **Sección 12 (Definición de Éxito del MVP):**
  * Matizar la métrica *"El segundo conector requiera menos esfuerzo"*: aclarar que el segundo conector se abordará **después** de la validación comercial del primero, no durante el MVP.

### 4.3 `106 - Use Cases`
* **Sección 13 (Conectar Sistemas Locales y Cloud):**
  * Aclarar en el texto introductorio que el Local Agent actúa en sistemas sin API pública (ej. Factusol Access), mientras que sistemas cloud conectan directamente vía API REST sin requerir Agent.
* **Sección 18 (Tabla de Priorización):**
  * Modificar fila `Nuevos conectores`: cambiar de `MVP: ⭐⭐⭐⭐⭐` a `MVP: — | Futuro: ⭐⭐⭐⭐⭐`.

### 4.4 `201 - Business Model`
* **Sección 16 (Modelo Inicial Recomendado):**
  * Reemplazar la hipótesis puramente gratuita por la hipótesis experimental de `504 §16`:
    ```text
    Hipótesis Comercial Inicial:
    Setup: 150 - 500 €
    Mensualidad: 49 - 99 €/mes
    Validación: Al menos 1 piloto pagado, preferiblemente 3-5 clientes de pago.
    ```

### 4.5 `301 - System Overview`
* **Sección 3 y 6 (Arquitectura Conceptual y Local Agent):**
  * Añadir el árbol de estrategias de conexión definido en `504 §6`:
    ```text
    Mecanismos de Conexión según el Connector:
    ├── API (REST, SOAP, API oficial del fabricante)
    ├── Local Agent (Bases de datos locales, ODBC, software legacy)
    └── Database (Conexión directa cuando sea accesible y seguro)
    ```
  * Establecer explícitamente: *"El Core permanece agnóstico al mecanismo de transporte físico utilizado por el Connector."*

### 4.6 `303 - Agent`
* **Sección 1 (Propósito):**
  * Añadir nota de alcance: *"El Agent es un componente complementario, no obligatorio para todas las integraciones. Se activa únicamente para conectores que interactúan con recursos locales o software legacy."*

### 4.7 `304 - Connectors`
* **Sección 4 (Responsabilidades de un Conector):**
  * Incorporar la selección de transporte: el conector determina si consume la API oficial del fabricante o delega en el Local Agent.
* **Sección 15 (Conector Oficial Factusol):**
  * Incluir la directriz de `504 §7`: investigar y utilizar la API oficial cuando cubra adecuadamente la operación; utilizar el Local Agent / Access ODBC cuando sea técnicamente necesario.
* **Sección 24 (Conectores del MVP):**
  * Eliminar el punto `3. Tercer conector`. El MVP abarca **únicamente Factusol y WooCommerce**.

### 4.8 `310 - Synchronization`
* **Nueva Sección 21.bis o Sección 39 (Reconciliación Básica):**
  * Añadir especificación de **Reconciliación de Datos**:
    - Comparación periódica o bajo demanda del estado en ERP vs. Ecommerce para detectar pedidos huérfanos, desvíos de stock o discrepancias manuales realizadas fuera de ERP Bridge.
    - Informe de diferencias y acciones correctivas sugeridas.

### 4.9 `501 - MVP`
* **Sección 38 y 40 (Validación Comercial y Pricing):**
  * Sustituir *"MVP Free para conseguir usuarios"* por la validación estricta de `504`:
    - Meta: 10 conversaciones, 5 demostraciones, 3 pilotos, 3–5 clientes pagando Setup + Mensualidad.
    - Se elimina la gratuidad como criterio de éxito de mercado.
* **Sección 50 (Connector Expansion):**
  * Condicionar explícitamente la expansión a cumplir las 8 hipótesis ($H_1$ a $H_8$) de `504 §14`.

### 4.10 `502 - v1`
* **Sección 6 (Primeros Connectors):**
  * Añadir los criterios de selección de `504 §17`: demanda real, volumen de clientes potenciales, dificultad técnica, reutilización del Core y coste de soporte antes de iniciar el siguiente conector.

---

# 5. Documentos que NO Deben Modificarse

Los siguientes documentos del Blueprint **mantienen total coherencia** con `504 - Market Validation` y **no requieren cambios**:

* **`102 - Product Principles`**: Sus principios de independencia de ERP, no-code, adaptabilidad, robustez ante fallos y mantenibilidad por un solo desarrollador están 100% alineados.
* **`103 - Glossary`**: Los términos Core, Connector, Agent, Entity, Flow, Idempotencia y Mapping coinciden perfectamente.
* **`105 - Personas`**: Las personas prioritarias (Gerente PYME, Responsable de Administración, Técnico informático local) representan con exactitud al cliente inicial de Factusol definido en `504`.
* **`202 - Licensing`**: El esquema BSL 1.1 para Core y propietario para Agent/Dashboard sigue siendo válido.
* **`302 - Core`**: La definición de un Core desacoplado, modular y mínimo cumple exactamente con `504 §13`.
* **`305 - SDK`**: La extracción del SDK para después de validar conectores oficiales se alinea con la estrategia.
* **`308 - Security`**: Zero Trust, cifrado AES-256-GCM, TLS 1.3 y aislamiento multi-tenant son innegociables y se preservan íntegros.
* **`309 - Events`**: El bus asíncrono, los eventos canónicos y la cola DLQ sustentan la operabilidad exigida por `504`.
* **`311 - Data Model`**: Las 15 entidades nucleares cubren con precisión las necesidades de Factusol ↔ WooCommerce sin requerir ampliaciones prematuras.
* **`400 - Development (401, 402, 403, 404)`**: Los estándares de TypeScript estricto, testing con Access real, CI/CD determinista y despliegue monolítico modular de bajo coste son plenamente compatibles.
* **`600 - Decisions (601, 602, 603)`**: Las decisiones de arquitectura en estrella (ADR-001), agente saliente (ADR-002) y cliente primero (PDR-001/005) están en perfecta consonancia.

---

# 6. Decisiones que Deben Mantenerse

Estas decisiones arquitectónicas y de producto **no deben alterarse bajo ningún concepto**:

1. **Arquitectura Hub-and-Spoke (ADR-001):** El Modelo Canónico en estrella es innegociable; no se permiten integraciones punto a punto en malla.
2. **Desacoplamiento Absoluto del Core (ADR-003):** El Core jamás contendrá `if (factusol)` ni dependerá de conectores concretos.
3. **No subir la base de datos completa a la nube:** Los datos maestros del cliente permanecen en su ERP local; solo se transmiten deltas y metadatos.
4. **Seguridad y Cifrado:** AES-256-GCM para credenciales en reposo, TLS 1.3 en tránsito y hashes timing-safe.
5. **Idempotencia estricta:** Ningún reintento o duplicidad de eventos puede generar duplicados en Factusol ni en WooCommerce.
6. **Desarrollador único:** Toda decisión técnica debe poder ser mantenida, desplegada y soportada por una sola persona.

---

# 7. Decisiones Nuevas (Aportadas por `504`)

Las siguientes decisiones pasan a ser doctrina oficial del proyecto:

1. **Visión horizontal + Entrada vertical:** La amplitud es la visión a 10 años; el negocio inicial es vertical y especializado (Factusol ↔ WooCommerce).
2. **Local Agent condicional, no dogmático:** El Agent solo se despliega cuando un conector lo requiere para acceder a recursos locales sin API.
3. **API oficial de Factusol como primera opción:** Investigar y utilizar la API del fabricante donde sea viable; usar ODBC/Access local cuando sea estrictamente necesario.
4. **Diferenciación por Operabilidad y Reconciliación:** El valor no es mover datos (eso lo hacen scripts baratos), sino mantener la integración funcionando con diagnóstico legible y reconciliación de discrepancias.
5. **Validación Comercial por Pago:** Solo clientes que pagan Setup + Mensualidad cuentan para validar las hipótesis $H_1$ a $H_8$.
6. **Congelación de nuevos conectores durante el MVP:** Queda cancelado cualquier desarrollo de conectores adicionales (Sage, Shopify, PrestaShop) hasta alcanzar los hitos de validación comercial de Factusol.

---

# 8. Matriz de Impacto

### 8.1 Impacto Arquitectónico
* **Positivo / Simplificador:**
  * Al desvincular la obligatoriedad del Agent para todos los conectores, la arquitectura del Core se mantiene más limpia y flexible.
  * El Core solo interactúa con la `ConnectorInterface`; es el Connector quien decide si hace una llamada HTTPS directa o si envía una instrucción remota a través del canal WSS de un Local Agent.

### 8.2 Impacto en el MVP
* **Reducción de dispersión:**
  * Se elimina formalmente el "tercer conector" del alcance del MVP.
  * Todo el esfuerzo de desarrollo y pruebas se concentra en robustecer la pareja **Factusol ↔ WooCommerce** con tolerancia a fallos, reintentos e idempotencia impecables.

### 8.3 Impacto en el Agent
* **Enfoque quirúrgico:**
  * El Agent ya no pretende ser un middleware genérico omnipresente; es el **puente de ejecución local para Windows** especializado en Factusol, Access ODBC y sistemas cerrados.
  * Mantiene su diseño *outbound-only*, pairing en 3 minutos, heartbeat y seguridad ligada a hardware (HWID).

### 8.4 Impacto en Connectors
* **Estrategia dual de acceso:**
  * `connector-woocommerce`: 100% Cloud REST API (sin Agent).
  * `connector-factusol`: Híbrido (evaluar API oficial de Software DELSOL para operaciones soportadas; Local Agent con ODBC para lectura/escritura directa en `2252025.accdb` cuando la API no alcance o no esté contratada).

### 8.5 Impacto en Synchronization
* **Incorporación de Reconciliación:**
  * El motor de sincronización (`SyncEngine`) debe incorporar una rutina de reconciliación periódica que contraste los inventarios y pedidos entre Factusol y WooCommerce y alerte de descuadres producidos manualmente por el cliente en el ERP o en la tienda web.

### 8.6 Impacto en el Modelo de Negocio
* **Sostenibilidad desde el día 1:**
  * Se abandona la idea del plan gratuito como validador.
  * Se adopta un modelo de validación con pilotos pagados (Setup 150–500 € + 49–99 €/mes) que financia el soporte directo y confirma la disposición real a pagar de las PYMEs.

---

# 9. Conclusión y Próximos Pasos

El documento `504 - Market Validation` no desestabiliza la arquitectura de ERP Bridge; por el contrario, **la protege contra la sobre-ingeniería**, elimina ambigüedades sobre el rol del Local Agent y fija un criterio comercial pragmático para validar el producto antes de quemar recursos en expansión prematura.

### Próximos pasos recomendados:
1. **Revisión del usuario:** Validar y aprobar esta propuesta de cambio.
2. **Aplicación controlada:** Una vez aprobada, aplicar las modificaciones textuales en los 10 documentos identificados de forma coordinada.
3. **Cierre del MVP técnico:** Implementar los 4 puntos finales del código (Autenticación/Login, Reconciliación básica, Watcher reactivo y Scripts `.bat`).
