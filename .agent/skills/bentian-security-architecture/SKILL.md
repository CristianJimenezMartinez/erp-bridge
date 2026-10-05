---
name: bentian-security-architecture
description: >-
  Arquitectura completa de seguridad empresarial, criptografía asimétrica Ed25519 (RFC 8032),
  mitigación anti-TOCTOU en Windows UAC, aislamiento multi-tenant (OWASP API1:2023 BOLA),
  gestión de secretos y runbooks de verificación de Bentian ERP Bridge.
  Activar cuando se realicen cambios de autenticación, licencias, actualizaciones, secretos o infraestructura.
---

# Bentian Enterprise Security Architecture & Cryptographic Safeguards

Este documento constituye la especificación canónica y el manual de referencia técnica para todas las salvaguardas de seguridad, defensas en profundidad, estándares criptográficos y modelos de amenazas implementados en Bentian ERP Bridge (Agente de Escritorio Windows y API Central Cloud).

--------------------------------------------------------------------------------

## 1. Matriz de Seguridad y Alineación con Estándares Internacionales

Salvaguarda | Estándar / Clasificación | Vector Mitigado | Implementación Canónica
:--- | :--- | :--- | :---
**Firma de Licencias y Periodo Offline** | **RFC 8032 / NIST SP 800-186** (Ed25519 / Curve25519) | Manipulación de reloj local (*Clock Rollback*) y bypass de expiración sin conexión | `apps/api/src/services/license-proof.service.ts` y `apps/agent/src/license/license-proof.ts`
**Actualizador Atómico de Escritorio** | **CWE-367 / MITRE T1548.002** (Anti-TOCTOU & UAC) | Sustitución maliciosa de binarios o scripts en `%TEMP%` previa a la elevación UAC | `apps/agent/src/update/update.swapper.ts`
**Aislamiento Multi-Tenant** | **OWASP API1:2023** (Broken Object Level Authorization - BOLA) | Acceso o manipulación transversal de clientes/pedidos mediante cabecera `x-organization-id` | `apps/api/src/routes/org-scope.ts` (`resolveOrgId()`)
**Prevención de Carreras en Activación** | **OWASP API4:2023** (Unrestricted Resource Consumption) | Activaciones simultáneas sobrepasando el cupo `maxActivations` | `apps/api/src/middleware/keyed-mutex.ts` (`withKeyedLock()`)
**Custodia de Claves Criptográficas** | **CWE-312 / CIS Benchmark** (Cleartext Storage of Sensitive Information) | Fuga de material criptográfico privado por sincronización cloud o git | `%USERPROFILE%\.bentian-secrets\` con ACLs NTFS restrictivas
**Protección de Endpoints Públicos** | **OWASP API2:2023** (Broken Authentication) & **CWE-307** | Fuerza bruta en login de partners, emisión masiva de betas y suplantación de IP | `apps/api/src/middleware/rate-limit.ts` y `getClientIp()` con `req.ip`
**Persistencia Local Segura** | **DPAPI / AES-256-GCM** (Data Protection API) | Extracción de tokens y credenciales locales por otros usuarios del equipo | `%APPDATA%\Bentian Agent\` y `secure-store.ts`

--------------------------------------------------------------------------------

## 2. Modelado de Amenazas (STRIDE & MITRE ATT&CK)

### 2.1 Amenazas en el Agente de Escritorio Windows (Local-First)
1. **Elevación de Privilegios vía TOCTOU (T1548.002 / T1055):**
   * *Escenario:* Un atacante o proceso malware corriendo bajo el contexto del usuario estándar modifica el binario `.new` o el script de sustitución en `%TEMP%` justo cuando el usuario hace clic en el prompt UAC de Windows.
   * *Defensa:* Pre-staging a carpeta protegida (`Program Files\Bentian Agent\BentianAgent.exe.new`), cálculo y verificación del hash SHA-256 (`Get-FileHash`) antes de matar procesos, y ejecución elevada en memoria sin intermediarios en disco (`-EncodedCommand` Base64 UTF-16LE).
2. **Manipulación de Fecha y Tiempo del Sistema (T1070.006):**
   * *Escenario:* El cliente atrasa deliberadamente el reloj de Windows a una fecha anterior para prolongar indefinidamente los 7 días de gracia offline sin renovar su suscripción.
   * *Defensa:* La prueba de gracia offline requiere una firma asimétrica Ed25519 emitida por la API (`licenseProof`), conteniendo la fecha de emisión estricta (`issuedAt`) y expiración certificada (`expiresAt`). El Agente valida contra la clave pública embebida inmutable y detecta regresiones temporales contra marcas locales registradas en SQLite/DPAPI.
3. **Inyección en Comunicación Inter-Proceso (T1559.001 - Named Pipes):**
   * *Escenario:* Una aplicación foránea intenta conectarse al cerrojo de instancia única (`SingleInstanceLock`) para secuestrar el foco o inyectar comandos.
   * *Defensa:* Named pipe local con canal restringido y validación de seguridad de Windows (`SecurityIdentifier` del usuario activo), con debounce de 2.5s y timeout de conexión.

### 2.2 Amenazas en la API Central y Servidor Cloud (bridge.cristianjm.com)
1. **Falsificación Multi-Tenant / BOLA (OWASP API1:2023):**
   * *Escenario:* Un socio `RESELLER` o un cliente final utiliza herramientas como Burp Suite o curl para inyectar cabeceras `x-organization-id: <otra_empresa>` en llamadas a `/connections`, `/sync`, `/agents` o `/flows`.
   * *Defensa:* El helper centralizado `resolveOrgId(req)` determina la organización exclusivamente desde los claims criptográficos del token JWT (`req.user.organizationId`). La cabecera sólo es respetada si el rol autenticado es `SUPERADMIN` o `ADMIN`.
2. **Suplantación de IP para Evadir Lockout de Fuerza Bruta:**
   * *Escenario:* El atacante envía cabeceras `X-Forwarded-For: 127.0.0.1` o IPs dinámicas para sortear el contador de bloqueos por IP.
   * *Defensa:* El sistema utiliza `req.ip` validado por Express con configuración de proxy inverso de confianza (Caddy / Cloudflare), descartando cabeceras foráneas arbitrarias.
3. **Condición de Carrera en Activaciones Simultáneas:**
   * *Escenario:* Múltiples scripts de despliegue arrancan a la vez con la misma clave de licencia, intentando colar 5 activaciones en una licencia con `maxActivations: 1`.
   * *Defensa:* `withKeyedLock("activate:" + licenseKey)` serializa en memoria las operaciones sobre una misma clave, garantizando que el recuento y la inserción sean atómicos.

--------------------------------------------------------------------------------

## 3. Fundamentos Criptográficos y Decisiones de Diseño

### 3.1 ¿Por qué Ed25519 (RFC 8032) sobre RSA o ECDSA?
* **Rendimiento:** La verificación de firmas EdDSA sobre Curve25519 es órdenes de magnitud más rápida que RSA-2048/4096, permitiendo arranques instantáneos del Agente sin latencia.
* **Tamaño mínimo:** Claves públicas de 32 bytes (256 bits) y firmas fijas de 64 bytes frente a los 256–512 bytes de RSA, permitiendo incrustar firmas en cabeceras HTTP y tokens compactos.
* **Inmunidad a Fallos de Entropía:** A diferencia de ECDSA clásico (que requiere un número aleatorio $k$ criptográficamente perfecto en cada firma, donde un sesgo de 1 bit filtra la clave privada como ocurrió en Sony PS3), Ed25519 es determinista ($k = \text{SHA-512}(K_{\text{priv}}, M)$), eliminando riesgos de mala entropía en el servidor.
* **Resistencia a Canales Laterales:** Operaciones en tiempo constante (constant-time arithmetic), inmunes a ataques de temporización de CPU (timing attacks) y fallos de caché.

### 3.2 Formato Canónico de la Prueba de Licencia
```text
bentian-license-proof-v1
{licenseId}:{orgId}:{plan}:{issuedAt}:{expiresAt}
```
* **Separador de Dominio:** El prefijo `bentian-license-proof-v1\n` actúa como separación de dominio criptográfico, evitando ataques de tipo *signature reuse* en otros contextos del protocolo.
* **Clave Pública Inmutable del Agente:**
  `MCowBQYDK2VwAyEACVVTSQZYMUTWHDxBgc0ISCVN1NqLkkmW8qH3Dy+2Kwo=`

--------------------------------------------------------------------------------

## 4. Procedimientos Operativos y Runbooks de Mantenimiento

### 4.1 Quality Gate Obligatorio (Gate 7: Code Freeze)
```powershell
cd "g:\Otros ordenadores\Mi PC\Bentian\erp-bridge"
pnpm run quality:check
```
* **Criterio de Aprobación:** Calificación $\ge$ 9.5 / 10.00 y los 6 módulos sellados con estado `✓ sellado e intacto`.

### 4.2 Ejecución de la Suite Completa de Tests
```powershell
# Tests de API
cd "apps/api"
npm test

# Tests de Agente
cd "../agent"
npm test
```

### 4.3 Procedimiento de Publicación y Despliegue Seguro
```powershell
cd "g:\Otros ordenadores\Mi PC\Bentian\erp-bridge"
node builder/build.js patch --deploy
```
* Valida automáticamente la presencia de `%USERPROFILE%\.bentian-secrets\update-private.pem`.
* Genera los instaladores, hashes SHA-256 y firma digital Ed25519 en `manifest.json`.
* Despliega en caliente al servidor Hetzner con verificación HTTP 200 en `/health`.

--------------------------------------------------------------------------------

## 5. Índice de Documentación Detallada en `references/`
* [audit-and-decisions.md](./references/audit-and-decisions.md): Desglose exhaustivo de los 5 vectores de auditoría, pruebas de concepto y razonamiento matemático.
* [runbook-security-verifications.md](./references/runbook-security-verifications.md): Comandos de prueba, checklist de rotación de claves criptográficas y plan de contingencia ante desastres.
