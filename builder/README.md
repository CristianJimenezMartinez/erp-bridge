# BENTIAN AGENT BUILDER & RELEASE MANAGER

Directorio aislado para la compilación manual, empaquetado nativo y gestión de releases de Bentian Agent.

---

## 🚀 Uso Rápido (1 Clic)

Puedes ejecutar el archivo `build.bat` directamente desde el explorador de Windows o mediante PowerShell / CMD:

```cmd
:: 1. Compilar release de la versión actual (sin subir versión)
build.bat

:: 2. Subir versión PATCH (bugfixes) y compilar (ej: 0.1.0 -> 0.1.1)
build.bat patch

:: 3. Subir versión MINOR (nuevas funciones) y compilar (ej: 0.1.0 -> 0.2.0)
build.bat minor

:: 4. Subir versión MAJOR (cambios incompatibles) y compilar (ej: 0.1.0 -> 1.0.0)
build.bat major

:: 5. Asignar versión manual específica
build.bat 0.5.0
```

---

## 🛠️ Herramientas Disponibles

| Script | Descripción |
|---|---|
| `build.bat [tipo]` | Script de 1 clic para Windows que orquesta todo el proceso. |
| `version.js [accion]` | Gestor de versiones SemVer sincronizado en todo el monorepo. |
| `build.js [version]` | Orquestador maestro de la release (bundle + exe + installer + hashes + manifest). |
| `build-bundle.js` | Empaquetador esbuild CommonJS que genera `bentian-agent.bundle.cjs`. |
| `build-exe.js` | Generador de ejecutable nativo de Windows `BentianAgent.exe` (Node SEA + postject). |
| `installer.iss` | Plantilla de Inno Setup 6 con compresión LZMA2 ultra. |

---

## 📦 Dónde se guardan los instaladores

Los entregables generados se almacenan automáticamente en la carpeta `releases/`:
```
releases/
├── latest.json                    # Puntero a la versión más reciente
└── v0.1.0/                        # Carpeta inmutable de la versión
    ├── Bentian-Setup-v0.1.0.exe   # Instalador para el cliente (~23 MB)
    ├── BentianAgent.exe           # Binario nativo directo (~88 MB)
    ├── adodb.js                   # Driver OLEDB auxiliar Factusol
    ├── checksums.txt              # Hashes SHA-256 de integridad
    └── manifest.json              # Manifiesto para el Auto-Updater
```

---

## 📋 Reglas de Versionado (SemVer 2.0.0)

* **PATCH (`+0.0.1`)**: Correcciones de bugs, optimizaciones internas. Los clientes se actualizan silenciosamente en segundo plano sin reiniciar.
* **MINOR (`+0.1.0`)**: Nuevas funcionalidades o conectores compatibles hacia atrás. Actualización automática suave.
* **MAJOR (`+1.0.0`)**: Cambios incompatibles (esquema de base de datos o contratos de API). Actualización obligatoria (`mandatory: true`).

Para más detalles, consulta el documento de política: [`docs/VERSIONING_POLICY.md`](../docs/VERSIONING_POLICY.md).
