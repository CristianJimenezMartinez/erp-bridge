# POLÍTICA Y REGLAS DE VERSIONADO DE BENTIAN (ERP BRIDGE)

**Objetivo:** Establecer un estándar de versionado estricto, predecible y 100% automatizado, diseñado para ser gestionado por 1 persona sin fricción y garantizar cero desajustes (*zero version drift*) para los clientes.

---

## 1. Estándar SemVer 2.0.0 (`MAJOR.MINOR.PATCH`)

El versionado de todo el ecosistema Bentian sigue la especificación **Semantic Versioning 2.0.0**:

$$\text{Versión} = \text{MAJOR} . \text{MINOR} . \text{PATCH}$$

### A. PATCH (`0.1.0` $\rightarrow$ `0.1.1`) — Correcciones y Parches
* **Cuándo se aplica:**
  * Corrección de errores (*bugfixes*).
  * Parches de seguridad o dependencias.
  * Mejoras de rendimiento en consultas SQL (Factusol OLEDB) o PostgreSQL.
  * Ajustes en la interfaz del instalador o mensajes de log.
* **Condición estricta:** NO modifica esquemas de base de datos ni contratos de la API.
* **Impacto en el cliente:** **Transparente e imperceptible**. El sistema Auto-Updater descarga y aplica el parche en segundo plano sin requerir intervención del usuario.

### B. MINOR (`0.1.1` $\rightarrow$ `0.2.0`) — Nuevas Funcionalidades Compatibles
* **Cuándo se aplica:**
  * Incorporación de nuevos conectores (ej: PrestaShop, Shopify).
  * Nuevos endpoints o campos canónicos opcionales en el SDK.
  * Nuevas vistas o funcionalidades en el Dashboard de control.
  * Nuevas opciones configurables en el Agente Local (ej: series de facturación personalizadas).
* **Condición estricta:** Mantiene **100% compatibilidad hacia atrás**. Los agentes antiguos siguen funcionando sin fallar.
* **Impacto en el cliente:** El agente se actualiza automáticamente; el cliente recibe un aviso no intrusivo informando de las nuevas funciones disponibles.

### C. MAJOR (`0.2.0` $\rightarrow$ `1.0.0`) — Cambios Incompatibles (*Breaking Changes*)
* **Cuándo se aplica:**
  * Modificación del esquema de base de datos PostgreSQL que requiera migración irreversible.
  * Cambio en el protocolo criptográfico de licencias (HWID, firma JWT, AES-256-GCM).
  * Rediseño de endpoints o contratos de comunicación Agente $\leftrightarrow$ Core.
  * Cambio en los requisitos mínimos de sistema (ej: descontinuación de un sistema operativo antiguo).
* **Condición estricta:** Requiere planificación de ventana de actualización y script de migración automática.
* **Impacto en el cliente:** En `manifest.json` se activa la bandera `mandatory: true`. La API exige actualización obligatoria antes de permitir reanudar la sincronización en tiempo real.

---

## 2. Regla de Paridad Monolítica (*Single Source of Truth*)

> [!IMPORTANT]
> **REGLA DE ORO:** Todos los 11 paquetes y aplicaciones del repositorio comparten obligatoriamente **el mismo número de versión canónica**:
>
> 1. `package.json` (Raíz del monorepo)
> 2. `builder/config.json` (Configuración maestra del Builder)
> 3. `builder/package.json` (Empaquetador)
> 4. `apps/agent/package.json` (Agente Local Windows)
> 5. `apps/api/package.json` (Servidor API Core)
> 6. `apps/dashboard/package.json` (Panel de Control Angular)
> 7. `packages/shared/package.json` (Modelos canónicos y contratos)
> 8. `packages/sdk/package.json` (SDK de conectores)
> 9. `packages/core/package.json` (Motores de sincronización y licencias)
> 10. `packages/connectors/factusol/package.json` (Conector Factusol)
> 11. `packages/connectors/woocommerce/package.json` (Conector WooCommerce)

**Queda estrictamente prohibido** versionar paquetes de forma independiente (ej: Agent 0.2.1 con Core 0.1.4). El comando `node builder/version.js check` audita automáticamente que los 11 ficheros coincidan al 100%.

---

## 3. Canales de Actualización (*Update Channels*)

El Auto-Updater y la tabla `update_manifests` soportan tres canales de distribución:

| Canal | Audiencia | Frecuencia | Criterio de Publicación |
|---|---|---|---|
| **`stable`** | Clientes finales en producción | Mensual / Quincenal | 100% pruebas E2E superadas sin errores. Canal por defecto. |
| **`beta`** | Clientes piloto y entorno de staging | Semanal | Nuevas funciones listas para validación en campo con consentimiento. |
| **`critical`** | Todos los clientes | Inmediata | Parche urgente ante fallos bloqueantes de Factusol o brechas de seguridad. |

---

## 4. Cómo se Aplica el Versionado en la Práctica (Comandos de 1 Clic)

El proceso está totalmente automatizado mediante el CLI de versionado y el script del Builder:

### Opción A: Solo subir versión (sin compilar instalador)
Desde la carpeta `builder/`:
```bash
node version.js patch     # Sube PATCH: 0.1.0 -> 0.1.1 en los 11 paquetes
node version.js minor     # Sube MINOR: 0.1.1 -> 0.2.0 en los 11 paquetes
node version.js major     # Sube MAJOR: 0.2.0 -> 1.0.0 en los 11 paquetes
node version.js set 0.3.0 # Fija versión exacta 0.3.0 en los 11 paquetes
node version.js check     # Verifica paridad al 100%
```

### Opción B: Subir versión Y compilar la release completa (1 Clic)
Ejecutar directamente en Windows:
```cmd
builder\build.bat patch    # Sube patch + compila ejecutable + crea instalador en releases/v0.1.1/
builder\build.bat minor    # Sube minor + compila ejecutable + crea instalador en releases/v0.2.0/
builder\build.bat major    # Sube major + compila ejecutable + crea instalador en releases/v1.0.0/
builder\build.bat 0.5.0    # Fija versión + compila release en releases/v0.5.0/
```

---

## 5. Inmutabilidad de Entregables en `releases/`

1. Las carpetas `releases/vX.Y.Z/` son **inmutables**: una vez generadas no se modifican ni se sobrescriben. Si se detecta un error en una versión publicada, se corrige y se publica una nueva versión PATCH (ej: `v0.1.1`).
2. Cada carpeta de release contiene:
   * `Bentian-Setup-vX.Y.Z.exe`: Instalador oficial con compresión LZMA2.
   * `BentianAgent.exe`: Ejecutable nativo directo (para modo portable o descargas delta).
   * `adodb.js`: Driver OLEDB certificado para esa versión.
   * `checksums.txt`: Hashes SHA-256 criptográficos de cada binario.
   * `manifest.json`: Manifiesto para el Auto-Updater con firma y requerimientos mínimos.
3. El fichero raíz `releases/latest.json` siempre apunta a la versión más reciente del canal estable.
