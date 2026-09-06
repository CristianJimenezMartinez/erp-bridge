# 004 - Blueprint Change Specification

## Estado

**Tipo:** Especificación técnica y editorial de cambios
**Documento base:** `504 - Market Validation.md` y `003 - Blueprint Change Proposal.md`
**Estado:** Especificación revisada y corregida — Lista para aprobación
**Fecha:** 2026-09-02
**Autor:** Cristian / Antigravity

---

# 1. Propósito y Principios Rectores

Esta especificación detalla de forma quirúrgica los cambios textuales y estructurales que deben aplicarse sobre los **10 documentos aprobados** del Blueprint, preservando de forma estricta los **14 documentos congelados**.

### 1.1 Regla de Oro: Evitar la "Factusolización"
ERP Bridge **NO** es un conector exclusivo ni un producto monoproducto para Factusol.
* **Visión:** Capa universal de integración y automatización empresarial.
* **Estrategia de Entrada:** Entrada vertical hiperenfocada en **Factusol ↔ WooCommerce** para resolver un dolor real, repetible y rentable.
* **MVP:** Alcance mínimo para validar el Core y la primera pareja de conectores sin dispersión.
* **Futuro (v1 / v2):** Expansión modular hacia nuevos conectores condicionada por demanda demostrada y sostenibilidad del soporte.

### 1.2 Regla Arquitectónica: Desacoplamiento del Local Agent
* El **Local Agent** deja de presentarse como un intermediario universal obligatorio.
* Pasa a ser formalmente un **mecanismo opcional de transporte/adaptación local** que el Connector utiliza cuando la API cloud no existe o no cubre la operación requerida.
* El Core es 100% agnóstico respecto a si un Connector se comunica vía API cloud directa o vía Local Agent.

### 1.3 Regla de Connectors y Acceso a Recursos Locales
Un Connector es la abstracción lógica de un sistema externo y puede implementar diferentes adaptadores según la topología del sistema:

```text
API CLOUD
Cliente → API Cloud → ERP Bridge

RECURSO LOCAL
Cliente → Local Agent → ERP Bridge
```

* **API Cloud:** Comunicación directa hacia servicios SaaS o APIs públicas del fabricante.
* **Recurso Local:** Si el Connector necesita acceder a bases de datos Access, ODBC, SQL Server local u otro recurso local, el acceso físico **se realiza obligatoriamente mediante el Local Agent** cuando la topología del cliente lo requiera.
* **Bajo ningún concepto** la infraestructura cloud de ERP Bridge se conectará directamente a una base de datos local del cliente ni exigirá abrir puertos entrantes. Se mantienen intactos los principios de:
  - Conexiones exclusivamente salientes (*outbound-only*).
  - Ausencia de apertura de puertos en el router o firewall del cliente.
  - No exposición de bases de datos locales a Internet.
  - Transferencia mínima de datos (solo deltas).
  - Procesamiento en el extremo (*edge processing*).

Para el caso de Factusol:
```text
Factusol Connector
       │
       ├── Official API Adapter (Cuando la API oficial sea suficiente para la operación requerida)
       │
       └── Local Agent Adapter (Cuando sea necesario acceder a recursos locales, Access / ODBC
                                u operaciones que la API oficial no cubra adecuadamente)
```

> **IMPORTANTE:** La investigación técnica de la API de Factusol sigue abierta. Por tanto, no se prejuzga ni se afirma a priori qué operaciones concretas requieren Local Agent y cuáles se resolverán vía API.

### 1.4 Regla de Sincronización: Reconciliación Básica
Se incorpora formalmente la **Reconciliación Básica** en el motor de sincronización (`SyncEngine`): capacidad de contrastar periódicamente el estado entre ERP y Ecommerce, registrar divergencias silenciosas y permitir la alineación sin duplicados.

### 1.5 Regla Comercial: Validación por Pago Real
Se elimina la hipótesis de "usuarios gratuitos" como métrica de validación. La validación exige que la empresa entregue accesos y pague (hipótesis experimental: Setup 150–500 € + Mensualidad 49–99 €).

---

# 2. Documentos Congelados (NO Modificar)

Quedan expresamente blindados contra modificaciones los siguientes documentos:
1. `102 - Product Principles.md`
2. `103 - Glossary.md`
3. `105 - Personas.md`
4. `202 - Licensing.md`
5. `302 - Core.md`
6. `305 - SDK.md`
7. `308 - Security.md`
8. `309 - Events.md`
9. `311 - Data Model.md`
10. `401 - Coding Standards.md`
11. `402 - Testing.md`
12. `403 - CI/CD.md`
13. `404 - Deployment.md`
14. `503 - Future Ideas.md`

---

# 3. Especificación Detallada de Cambios por Documento

A continuación se define, documento por documento, el análisis de impacto y los bloques textuales exactos a reemplazar.

---

## Documento 1: `101 - Vision.md`

### 1.1 Estado actual
El documento describe la visión a 10 años, pero en la **Sección 7 (Esquema de Evolución y Visión)** presenta un bloque `AHORA` que sitúa a ERP Bridge conectando simultáneamente CRM, IA, Logística y otros sistemas.

### 1.2 Problema detectado
Inconsistencia con la estrategia de *"Visión horizontal + entrada vertical"* de `504 §1, §8 y §18`. Induce a pensar que el producto actual ya aborda múltiples verticales, compitiendo frontalmente con Zapier/Make.

### 1.3 Cambio necesario
Reestructurar la Sección 7 para escalonar la evolución:
1. **AHORA:** Entrada vertical Factusol ↔ WooCommerce.
2. **SIGUIENTE (v1):** Expansión a ecommerce y ERPs seleccionados.
3. **VISIÓN (A largo plazo):** Capa horizontal con CRM, IA y Logística.
Incorporar en la Sección 4 el lema de diferenciación operativa de `504 §9`.

### 1.4 Texto y Secciones Concretas a Modificar

#### Sección 4: Añadir lema al final
**Texto a añadir al final de la Sección 4:**
```markdown
La diferenciación de ERP Bridge no es únicamente mover datos entre sistemas, sino mantener la integración funcionando de forma operable, transparente y resiliente a lo largo del tiempo.
```

#### Sección 7: Sustituir el esquema de evolución
**Texto actual:**
```markdown
### AHORA

```text
ERP → ERP Bridge → Ecommerce
                  → CRM
                  → IA
                  → Logística
                  → Otros sistemas
```
```

**Texto propuesto de sustitución:**
```markdown
### AHORA (Entrada Vertical)

```text
Factusol → ERP Bridge → WooCommerce
```
*Enfoque deliberado en resolver un caso real, repetible y operable antes de ampliar horizontalmente.*

### SIGUIENTE (Plataforma v1)

```text
ERP / Software de Gestión → ERP Bridge Core → Canales Digitales / Ecommerce
```

### VISIÓN (10 años — Capa de Conectividad Empresarial)

```text
Todos los sistemas de la empresa
(ERP, CRM, Ecommerce, Logística, APIs, IA)
             ↓
        ERP Bridge
             ↓
Comunicación + Automatización + Operabilidad + IA
```
```

### 1.5 Qué contenido debe conservarse
* Definición de ERP Bridge (§1) e independencia del software del cliente.
* El principio fundamental: *"ERP Bridge debe adaptarse a la empresa, nunca la empresa a ERP Bridge"*.
* La lista de lo que NO se quiere construir (§5).

### 1.6 Impacto en otros documentos
Alinea la visión con `104 - Product Scope` y `504 - Market Validation`.

### 1.7 Riesgo de contradicción y mitigación
* **Riesgo:** Que parezca que ERP Bridge renuncia a ser una plataforma general.
* **Mitigación:** Dejar explícito en la cabecera que la visión horizontal sigue intacta y que Factusol ↔ WooCommerce es la cuña vertical de entrada.

---

## Documento 2: `104 - Product Scope.md`

### 2.1 Estado actual
La **Sección 7 (MVP)** menciona *"Primeros conectores"* (en plural) y define *"Un sistema de conexión local cuando sea necesario"*.

### 2.2 Problema detectado
Falta de concreción en el alcance del MVP, permitiendo la interpretación de que el MVP debe incluir 3 o más conectores. No clarifica la relación entre el conector y el Local Agent.

### 2.3 Cambio necesario
Fijar el MVP estrictamente en la pareja Factusol ↔ WooCommerce y formalizar que el Local Agent es un mecanismo opcional utilizado cuando sea necesario acceder a recursos locales o bases de datos Access.

### 2.4 Texto y Secciones Concretas a Modificar

#### Sección 7: Ajustar el alcance del MVP
**Texto actual en §7 (El MVP incluirá):**
```markdown
### El MVP incluirá:
- Un núcleo común.
- Un sistema de conexión local cuando sea necesario.
- Primeros conectores.
- Gestión de credenciales.
- Mapeo de datos.
- Sincronización.
- Flujos básicos.
- Gestión de errores.
- Dashboard básico.
- Logs y monitorización.
```

**Texto propuesto de sustitución:**
```markdown
### El MVP incluirá:
- Un núcleo común (Core mínimo reutilizable).
- Primeros conectores del MVP comercial: **Factusol** y **WooCommerce**.
- Local Agent como mecanismo opcional de conectividad local (utilizado cuando sea necesario acceder a recursos locales, bases de datos Access u operaciones no cubiertas por la API oficial).
- Gestión de credenciales y autenticación.
- Mapeo de datos canónico.
- Motor de sincronización con reintentos e idempotencia.
- Reconciliación básica de datos.
- Flujos básicos de automatización.
- Gestión y visibilidad de errores.
- Dashboard administrativo básico.
- Logs y monitorización de conexiones.
```

#### Sección 12: Ajustar métrica del segundo conector
**Texto propuesto para matizar el punto final de §12:**
```markdown
- **Validación del Core:** El segundo conector (que se abordará tras validar comercialmente el primero con clientes de pago) deberá requerir significativamente menos esfuerzo gracias a la reutilización del Core.
```

### 2.5 Qué contenido debe conservarse
* Regla de oro de §1 (*"Si algo no está dentro del alcance, no lo construimos durante el MVP"*).
* Sección 8 ("Fuera del MVP").
* Sección 11 ("Criterio para Añadir Funcionalidades").

### 2.6 Impacto en otros documentos
Consistencia con `304 - Connectors` y `501 - MVP`.

### 2.7 Riesgo de contradicción y mitigación
* **Riesgo:** Confusión sobre la obligatoriedad del Agent en Factusol.
* **Mitigación:** Explicitar que Factusol utilizará la API oficial cuando sea suficiente, y el Local Agent cuando sea necesario acceder a recursos locales o bases de datos Access, sin prejuzgar qué operaciones requerirán Agent hasta concluir la investigación técnica.

---

## Documento 3: `106 - Use Cases.md`

### 3.1 Estado actual
En la **Sección 13**, el diagrama muestra que toda conexión hacia ERP Bridge Cloud pasa por el Agente. En la **Sección 18 (Tabla de Priorización)**, la fila *"Nuevos conectores"* figura con prioridad `MVP: ⭐⭐⭐⭐⭐`.

### 3.2 Problema detectado
Contradice `504 §6` (el Agent no es obligatorio) y `504 §12, §17` (no construir nuevos conectores durante el MVP).

### 3.3 Cambio necesario
Actualizar la Sección 13 para aclarar que el Agent solo media en sistemas locales/cerrados y reajustar la tabla de priorización de la Sección 18.

### 3.4 Texto y Secciones Concretas a Modificar

#### Sección 13: Ajustar descripción conceptual
**Texto propuesto para añadir antes del diagrama:**
```markdown
Cuando un sistema empresarial funciona en red local sin API accesible para la operación requerida (como Factusol sobre base de datos Access local), el Local Agent actúa como puente saliente seguro. Los sistemas cloud (como WooCommerce) conectan directamente a ERP Bridge mediante API REST sin requerir instalación local.
```

#### Sección 18: Modificar tabla de priorización
**Fila actual:**
```markdown
| **Nuevos conectores** | ⭐⭐⭐⭐⭐ | |
```

**Fila propuesta de sustitución:**
```markdown
| **Nuevos conectores** | | ⭐⭐⭐⭐⭐ |
```
*(Se añade nota al pie de tabla: "Durante el MVP solo se implementan Factusol y WooCommerce. Nuevos conectores como Sage o Shopify se priorizan para v1 tras la validación comercial").*

### 3.5 Qué contenido debe conservarse
* Todos los casos de uso UC-01 a UC-11 (Productos, Stock, Pedidos, Clientes, Errores, Monitorización).
* La regla de que la automatización no debe ocultar los errores (§10).

### 3.6 Impacto en otros documentos
Alineación directa con `304 - Connectors` y `501 - MVP`.

### 3.7 Riesgo de contradicción y mitigación
* **Riesgo:** Dejar desprotegidos los casos de uso futuros.
* **Mitigación:** Mantenerlos catalogados en la columna `Futuro` con máxima prioridad para la fase posterior.

---

## Documento 4: `201 - Business Model.md`

### 4.1 Estado actual
En la **Sección 16 (Modelo Inicial Recomendado)** y **Sección 7 (Modelo Gratuito)** se insinúa una estrategia basada en distribución gratuita para traccionar.

### 4.2 Problema detectado
Contradicción directa con `504 §15 y §16`, que establece que la señal de validación es que una empresa pague y define la hipótesis de Setup + Mensualidad.

### 4.3 Cambio necesario
Reorientar la Sección 16 hacia la validación de valor mediante clientes de pago reales, incorporando la hipótesis de precios de `504 §16` sin cerrarla como tarifa definitiva.

### 4.4 Texto y Secciones Concretas a Modificar

#### Sección 16: Sustituir la hipótesis inicial
**Texto actual en §16:**
```markdown
### Hipótesis Inicial:
> **ERP Bridge dispondrá de un núcleo de entrada accesible/gratuito, monetizando progresivamente mediante conectores, funciones premium, servicios cloud, soporte, mantenimiento e implementación.**
```

**Texto propuesto de sustitución:**
```markdown
### Hipótesis Comercial Experimental (Validación MVP):

La validación del producto no se basará en métricas de usuarios gratuitos, sino en la disposición real a pagar por resolver el problema de integración.

Se probará inicialmente la siguiente hipótesis de precio:
* **Setup / Puesta en marcha asistida:** 150 – 500 € (pago único)
* **Suscripción mensual:** 49 – 99 €/mes (mantenimiento, operabilidad, reintentos y soporte)

*Nota: Estas cifras representan una hipótesis experimental sujeta a ajuste con clientes reales durante la fase de validación.*
```

### 4.5 Qué contenido debe conservarse
* El principio económico fundamental (§2): *"No cobrar al cliente simplemente por almacenar sus datos"*.
* La métrica económica fundamental (§15): *"Coste marginal de incorporar un nuevo cliente"*.
* Los modelos Local, Cloud e Híbrido (§4, §5, §6).

### 4.6 Impacto en otros documentos
Consistencia con `501 - MVP §40` y `504 §16`.

### 4.7 Riesgo de contradicción y mitigación
* **Riesgo:** Confundir una hipótesis de validación con una lista de precios cerrada.
* **Mitigación:** Utilizar explícitamente el término "Precio experimental / Hipótesis comercial".

---

## Documento 5: `301 - System Overview.md`

### 5.1 Estado actual
El diagrama general de la **Sección 3** y la **Sección 6** describen el Local Agent de forma centralizada para todos los sistemas empresariales locales.

### 5.2 Problema detectado
No refleja el principio de `504 §6` sobre los múltiples mecanismos de acceso que pertenecen al Connector, y podría inducir a pensar erróneamente que ERP Bridge Cloud se conecta directamente a bases de datos locales.

### 5.3 Cambio necesario
Clarificar en la Sección 3, 5 y 6 que existen dos grandes vías de transporte según la topología del sistema: API Cloud directa o acceso a recursos locales mediante el Local Agent. Descartar cualquier conexión cloud directa hacia bases de datos locales sin pasar por el agente.

### 5.4 Texto y Secciones Concretas a Modificar

#### Sección 6 (Local Agent): Actualizar concepto
**Texto propuesto para añadir al inicio de §6:**
```markdown
El Local Agent es un mecanismo opcional de conectividad que se activa cuando el conector necesita interactuar con recursos locales, software legacy o bases de datos sin API pública expuesta.

Cuando un sistema externo dispone de API cloud accesible (como WooCommerce o Shopify), la comunicación se realiza directamente desde el Core o la API de ERP Bridge sin requerir la presencia del Local Agent.
```

#### Sección 5 (Connectors): Añadir relación con mecanismos de transporte
**Texto propuesto para añadir en §5:**
```markdown
### Estrategias de Conectividad por Connector
Un Connector puede implementar internamente diferentes mecanismos de adaptación según la topología del sistema:

```text
API CLOUD
Cliente → API Cloud → ERP Bridge

RECURSO LOCAL
Cliente → Local Agent → ERP Bridge
```

1. **API Cloud Adapter:** Comunicación directa vía API (REST, SOAP o API oficial del fabricante) para servicios en la nube o endpoints accesibles.
2. **Local Agent Adapter:** Ejecución delegada a través del Local Agent cuando el Connector necesita acceder a recursos locales, software legacy o bases de datos on-premise (Access, ODBC, SQL Server local).

Bajo ningún concepto la infraestructura cloud de ERP Bridge se conecta directamente a una base de datos local del cliente sin intermediación. Todo acceso a recursos locales se realiza a través del Local Agent para garantizar:
* Conexiones salientes exclusivas (*outbound-only*).
* Ausencia de apertura de puertos entrantes o reglas NAT en el firewall del cliente.
* No exposición de bases de datos locales a Internet.
* Transferencia mínima de datos (solo deltas).
* Procesamiento local en el extremo (*edge processing*).

El Core interactúa únicamente a través de la interfaz canónica del Connector, permaneciendo agnóstico al mecanismo de transporte físico subyacente.
```

### 5.5 Qué contenido debe conservarse
* Los principios arquitectónicos (§2) íntegros.
* El Common Data Model (§12) y la arquitectura en estrella.
* El pipeline de datos: `Source → Connector → Normalize → Transform → Validate → Core → Connector → Target`.

### 5.6 Impacto en otros documentos
Alineación fundamental con `303 - Agent` y `304 - Connectors`.

### 5.7 Riesgo de contradicción y mitigación
* **Riesgo:** Que el lector asuma que Factusol siempre requiere o nunca requiere Agent.
* **Mitigación:** Aclarar que Factusol utilizará la API oficial cuando sea suficiente para la operación requerida y el Local Agent cuando sea necesario acceder a recursos locales, bases de datos Access u operaciones que la API oficial no cubra adecuadamente (sin afirmar a priori qué operaciones requerirán Agent, ya que la investigación técnica de la API sigue abierta).

---

## Documento 6: `303 - Agent.md`

### 6.1 Estado actual
El documento define el Agent con gran detalle técnico, pero en la introducción puede interpretarse como un componente universal para cualquier instalación de ERP Bridge.

### 6.2 Problema detectado
Falta el matiz explícito de que el Agent es condicional y solo se despliega cuando el conector lo exige para acceder a recursos locales.

### 6.3 Cambio necesario
Añadir en la Sección 1 y 22 la clarificación de que el Agent es un ejecutor especializado para recursos locales y que el Core no depende de él cuando opera con APIs cloud.

### 6.4 Texto y Secciones Concretas a Modificar

#### Sección 1 (Propósito): Añadir nota aclaratoria
**Texto propuesto para añadir al final de §1:**
```markdown
El Agent no es un componente obligatorio para todas las integraciones de ERP Bridge. Constituye un adaptador de ejecución local especializado que se despliega únicamente cuando el Connector requiere acceder a sistemas cerrados, archivos locales, puertos locales o servicios sin presencia cloud.
```

#### Sección 22 (El Agent como Extensión del Core): Matizar dependencia
**Texto propuesto para complementar §22:**
```markdown
Para sistemas con APIs cloud estándar, el Core orquesta y ejecuta las llamadas directamente. Para sistemas locales o legacy, el Core delega la ejecución física en el Local Agent mediante instrucciones canónicas seguras.
```

### 6.5 Qué contenido debe conservarse
* Todas las directrices de seguridad (§5 Outbound-only, §8 Mínimo acceso, §9 Cifrado local, §16 TLS 1.3/AES-256).
* Pairing en 3 minutos, Heartbeat, Offline Queue y reconexión automática.
* La política de no subir la base de datos completa (§21 Mínima transferencia).

### 6.6 Impacto en otros documentos
Coherencia con `301 - System Overview` y `304 - Connectors`.

### 6.7 Riesgo de contradicción y mitigación
* **Riesgo:** Rebajar la importancia técnica del Agent.
* **Mitigación:** Enfatizar que para entornos locales cerrados, el Agent sigue siendo la pieza clave de la ventaja competitiva.

---

## Documento 7: `304 - Connectors.md`

### 7.1 Estado actual
La **Sección 24 (Conectores del MVP)** establece: *1. Factusol, 2. WooCommerce, 3. Tercer conector*. Además, la **Sección 15** define Factusol exclusivamente como conector sobre Access/ODBC.

### 7.2 Problema detectado
Contradice `504 §12` (eliminar el tercer conector del MVP) y `504 §7` (priorizar la API oficial de Factusol cuando cubra la operación).

### 7.3 Cambio necesario
1. Eliminar el tercer conector del MVP en la Sección 24.
2. Añadir en la Sección 15 la directriz sobre la API oficial frente al acceso mediante Local Agent a recursos locales o Access.
3. Dejar explícito que la investigación técnica de la API de Factusol está en curso y no prejuzgar qué operaciones requerirán Agent.

### 7.4 Texto y Secciones Concretas a Modificar

#### Sección 15 (Conector Oficial de Factusol): Añadir directriz de acceso
**Texto propuesto para añadir en §15:**
```markdown
### Estrategia de Conectividad de Factusol
El Connector de Factusol adoptará una arquitectura de adaptadores desacoplados:
1. **API Oficial:** Factusol utilizará la API oficial del fabricante cuando sea suficiente para la operación requerida.
2. **Local Agent (ODBC / Access):** El Local Agent se utilizará cuando sea necesario acceder a recursos locales, bases de datos Access u operaciones que la API oficial no cubra adecuadamente.

*Nota técnica: Dado que la investigación técnica de la API oficial de Factusol todavía está en curso, no se prejuzga ni se afirma a priori qué operaciones específicas requerirán Local Agent y cuáles se resolverán vía API.*
```

#### Sección 24 (Conectores del MVP): Eliminar tercer conector
**Texto actual en §24:**
```markdown
## 24. Conectores del MVP

Foco estricto en la validación del producto:
1. **Factusol:** Para validar conectividad local con bases de datos tradicionales.
2. **WooCommerce:** Para validar conectividad cloud y APIs REST de ecommerce.
3. **Tercer conector:** Se elegirá posteriormente según la demanda comercial real del mercado.
```

**Texto propuesto de sustitución:**
```markdown
## 24. Conectores del MVP

Foco estricto en la validación del producto:
1. **Factusol:** Conector de entrada para validar la integración con ERP empresarial (utilizando la API oficial cuando sea suficiente, o el Local Agent para acceder a recursos locales o bases de datos Access cuando sea necesario).
2. **WooCommerce:** Conector para validar la integración cloud directa vía API REST de ecommerce.

*No se incluirá un tercer conector durante la fase de MVP. La extensibilidad y el desacoplamiento se demuestran mediante el cumplimiento estricto del Connector Contract en ambos conectores, no por la cantidad de módulos construidos.*
```

### 7.5 Qué contenido debe conservarse
* El contrato unificado del conector (§6) y modelo de capacidades (§8).
* La regla de oro (§5): *"El Connector NO controla los workflows; proporciona capacidades y el Core orquesta"*.
* La independencia modular y suite de testing por conector (§18, §20).

### 7.6 Impacto en otros documentos
Consistencia con `104 - Product Scope` y `501 - MVP`.

### 7.7 Riesgo de contradicción y mitigación
* **Riesgo:** Dudas sobre si el SDK sigue siendo necesario.
* **Mitigación:** Reiterar que el SDK se mantiene como herramienta interna para los conectores oficiales y se abrirá a terceros en fases posteriores.

---

## Documento 8: `310 - Synchronization.md`

### 8.1 Estado actual
El documento detalla de forma excelente los flujos delta, polling, eventos, idempotencia y resolución de conflictos, pero no cuenta con una sección dedicada a la **Reconciliación Básica de Datos**.

### 8.2 Problema detectado
Falta cubrir explícitamente la directriz de `504 §5, §9 y §13`, donde la reconciliación es uno de los valores diferenciales frente a simples herramientas de transferencia de datos.

### 8.3 Cambio necesario
Incorporar una sección formal sobre **Reconciliación Básica** que defina cómo ERP Bridge audita periódicamente la coherencia entre el ERP y el canal digital.

### 8.4 Texto y Secciones Concretas a Modificar

#### Añadir nueva sección tras la Sección 20 (antes de Retry): "20.bis / Reconciliación Básica"
**Texto propuesto para incorporar:**
```markdown
## 20.bis Reconciliación Básica de Datos

Además de procesar eventos en tiempo real o cambios incrementales, ERP Bridge debe proporcionar un mecanismo de **reconciliación periódica** para garantizar que el estado en destino refleja con fidelidad la realidad del origen.

### Objetivo de la Reconciliación
Detectar divergencias silenciosas provocadas por:
* Modificaciones manuales realizadas directamente en WooCommerce o en Factusol sin pasar por ERP Bridge.
* Errores transitorios no recuperados.
* Caídas prolongadas de conexión durante periodos de alta actividad.

### Funcionamiento Básico:
1. **Auditoría de consistencia:** El sistema compara a intervalos regulares (o bajo demanda) identificadores clave y estados (ej. existencias de stock de productos activos o estado de pedidos recientes).
2. **Detección de divergencias:** Identifica registros desalineados sin alterar datos de forma destructiva.
3. **Registro y visibilidad:** Reporta las discrepancias en el Dashboard de forma comprensible.
4. **Acción correctiva:** Permite al usuario forzar la re-sincronización guiada aplicando la política de *Source of Truth*.
```

### 8.5 Qué contenido debe conservarse
* El concepto de *Source of Truth* por entidad (§5).
* Los Jobs de sincronización (§7), delta sync (§10) e idempotencia mediante External IDs (§16, §17).
* La política de tolerancia a fallos por registro individual (§20).

### 8.6 Impacto en otros documentos
Enriquece `307 - Dashboard` y `501 - MVP`.

### 8.7 Riesgo de contradicción y mitigación
* **Riesgo:** Diseñar un sistema de reconciliación demasiado complejo para el MVP.
* **Mitigación:** Restringir el alcance a reconciliación básica de catálogo y stock basada en SKU/IDs, sin motores de arbitraje complejos.

---

## Documento 9: `501 - MVP.md`

### 9.1 Estado actual
* **Sección 38 y 40:** Plantea que el MVP se distribuirá inicialmente gratis (*"Free para conseguir usuarios y feedback"*).
* **Sección 50:** Habla de desarrollar Sage, Shopify, PrestaShop inmediatamente después de validar Factusol + WooCommerce.

### 9.2 Problema detectado
Contradice frontalmente `504 §14, §15, §16 y §20`: la validación exige cobro, y la expansión a nuevos conectores exige cumplir criterios comerciales estrictos ($H_1$ a $H_8$).

### 9.3 Cambio necesario
1. Actualizar las secciones de validación comercial y precios con la hipótesis experimental de Setup + Mensualidad de `504`.
2. Supeditar la expansión de conectores a la validación de repetibilidad con clientes reales.
3. Incorporar la Reconciliación básica en la lista de capacidades del MVP.

### 9.4 Texto y Secciones Concretas a Modificar

#### Sección 38 (Validación Comercial): Sustituir por criterio de pago
**Texto actual en §38:**
```markdown
## 38. MVP Commercial Validation

El MVP no necesita miles de usuarios.
La primera validación podrá realizarse con:
1 empresa → 3 empresas → 5 empresas → 10 empresas
El objetivo es aprender antes de escalar.
```

**Texto propuesto de sustitución:**
```markdown
## 38. MVP Commercial Validation

La validación comercial del MVP exige evidencia de valor de negocio mediante disposición de pago.

Objetivos de la fase de validación inicial:
* 10 conversaciones con empresas objetivo.
* 5 demostraciones guiadas.
* 3 pilotos en entornos reales.
* Al menos 1 piloto de pago; preferiblemente entre 3 y 5 clientes pagando.

> **Regla de validación:** El producto no se considerará validado únicamente por recibir comentarios positivos o interés verbal. La validación exige que una empresa entregue credenciales y pague por utilizarlo.
```

#### Sección 40 (MVP Pricing): Actualizar hipótesis de precio
**Texto actual en §40:**
```markdown
## 40. MVP Pricing

El MVP podrá utilizarse inicialmente:
Free
para conseguir usuarios y feedback.
```

**Texto propuesto de sustitución:**
```markdown
## 40. MVP Pricing (Hipótesis Experimental)

El precio no se fijará de forma definitiva antes de contar con tracción real, pero se evaluará la siguiente hipótesis comercial:
* **Puesta en marcha (Setup):** 150 – 500 €
* **Suscripción de servicio:** 49 – 99 €/mes

*El objetivo de esta estructura es validar la viabilidad económica del soporte directo antes de abrir la contratación general.*
```

#### Sección 50 (Connector Expansion): Condicionar expansión
**Texto propuesto para añadir a §50:**
```markdown
La construcción de nuevos conectores (Sage, Shopify, PrestaShop) NO se iniciará hasta que la integración Factusol ↔ WooCommerce esté estabilizada, cuente con clientes de pago y haya demostrado que la tasa de soporte técnico es sostenible para un solo desarrollador.
```

### 9.5 Qué contenido debe conservarse
* Los Milestones 1 a 4 (§53-§56: Catálogo, Sync programada, Pedidos, Stock).
* Los Criterios Técnicos de Éxito (§37: Instalar, Conectar, Detectar, Sincronizar, Idempotencia, Ver errores).
* La regla de los 3 minutos (§36).

### 9.6 Impacto en otros documentos
Consistencia total con `504 - Market Validation` y `201 - Business Model`.

### 9.7 Riesgo de contradicción y mitigación
* **Riesgo:** Fricción con usuarios que esperaban una beta 100% gratuita.
* **Mitigación:** Explicar que el cobro es la garantía de compromiso mutuo y soporte dedicado durante la fase piloto.

---

## Documento 10: `502 - v1.md`

### 10.1 Estado actual
En la **Sección 5 y 6**, v1 se define con una apertura rápida hacia múltiples ERPs, CRMs y plataformas ecommerce simultáneas.

### 10.2 Problema detectado
Riesgo de dispersión prematura y competencia frontal con herramientas de automatización masiva tipo Zapier, contraviniendo `504 §10, §17 y §19`.

### 10.3 Cambio necesario
Incorporar formalmente el filtro de decisión y criterios de evidencia de `504 §17 y §19` antes de abordar cualquier conector subsiguiente.

### 10.4 Texto y Secciones Concretas a Modificar

#### Sección 6 (Primeros Connectors): Añadir criterios de selección
**Texto propuesto para añadir al final de §6:**
```markdown
### Criterios de Selección para Conectores en v1
No se desarrollarán conectores basándose únicamente en ideas técnicas. La elección del siguiente conector requerirá evidencia objetiva evaluando:
1. **Demanda real:** Número de solicitudes confirmadas de clientes potenciales.
2. **Volumen de mercado:** Masa crítica de PYMEs españolas usuarias del sistema.
3. **Dificultad técnica y mantenimiento:** Complejidad de sus APIs o bases de datos y coste de soporte continuo.
4. **Reutilización del Core:** Capacidad de aprovechar los modelos canónicos y motores existentes.
5. **Potencial de rentabilidad:** Disposición a pagar y competencia existente.
```

### 10.5 Qué contenido debe conservarse
* La definición de v1 (§3: *"De prototipo validado a producto estable"*).
* La arquitectura de automatizaciones (WHEN / IF / DO), roles de usuario y logs de auditoría.
* Las políticas de reintentos, dead letter y gestión de credenciales.

### 10.6 Impacto en otros documentos
Coherencia con `500 - Roadmap` y `504 - Market Validation`.

### 10.7 Riesgo de contradicción y mitigación
* **Riesgo:** Frenar la visión de crecimiento.
* **Mitigación:** Recordar que estos criterios aseguran que cada hora de desarrollo genere tracción comercial inmediata.

---

# 4. Matriz de Coherencia y Trazabilidad

| Decisión de `504 - Market Validation` | Documentos Impactados y Modificados | Documentos de Respaldo Inalterados |
|---|---|---|
| **1. Entrada vertical (Factusol ↔ Woo)** | `101 §7`, `104 §7`, `106 §18`, `304 §24`, `501 §38` | `102 §15`, `105 §2`, `503 §1` |
| **2. Local Agent condicional, no forzado** | `104 §7`, `106 §13`, `301 §6`, `303 §1`, `304 §15` | `302 §1`, `308 §7`, `404 §2` |
| **3. API oficial prioritaria en Factusol (Agent para recursos locales)** | `304 §15`, `504 §7` | `302 §2`, `401 §3` |
| **4. Reconciliación Básica obligatoria** | `104 §7`, `310 §20.bis`, `501 §7` | `309 §4`, `311 §14` |
| **5. Validación comercial con cobro** | `201 §16`, `501 §38, §40` | `105 §1`, `202 §1` |
| **6. Criterio de evidencia para expansión** | `501 §50`, `502 §6` | `500 §17-§19` |

---

# 5. Protocolo de Ejecución Posterior

Una vez aprobada esta especificación técnica:
1. **Ejecución atómica:** Se modificarán los 10 documentos exclusivamente en los bloques textuales indicados.
2. **Cero impacto de código:** No se alterará ningún archivo dentro de `packages/` o `apps/`.
3. **Verificación de sintaxis:** Se validará que todos los enlaces markdown y bloques de código rendericen limpiamente.
4. **Cierre de ciclo:** Se registrará la versión actualizada del Blueprint como la referencia final definitiva para la validación comercial de ERP Bridge.
