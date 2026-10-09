# Guía de Resolución de Windows Defender SmartScreen y Exclusiones de Antivirus
## Bentian ERP Bridge Agent — Guía de Operaciones en Producción

> **Documento Técnico de Soporte & Despliegue en Clientes**  
> **Área:** Compatibilidad con Windows 10/11, Windows Server y EDRs Corporativos  
> **Versión Oficial:** v0.3.8 (Octubre 2026)  
> **Estado:** Validado y Recomendado  
> **Afecta a:** `BentianAgent.exe`, `BentianTray.exe`, `Bentian-Setup.exe` (canónico) o `Bentian-Setup-v0.3.8.exe`

---

## 1. ¿Por Qué Aparece la Pantalla Azul de SmartScreen?

Al descargar e iniciar por primera vez el instalador oficial (`Bentian-Setup.exe` o `Bentian-Setup-v0.3.8.exe`) o el ejecutable del agente en equipos con Windows 10, Windows 11 o Windows Server, el sistema operativo puede mostrar una ventana de alerta azul con el mensaje:

> **"Windows protegió su PC"**  
> *Microsoft Defender SmartScreen evitó el inicio de una aplicación no reconocida. Si ejecuta esta aplicación, su PC podría estar en riesgo.*

### El Mecanismo de Reputación de Microsoft SmartScreen
Microsoft Defender SmartScreen no analiza el código binario buscando virus en esta etapa: **evalúa la reputación histórica acumulada de la firma digital del ejecutable**.

1. **Certificados Estándar (OV) vs Certificados EV (Extended Validation):**
   - Un certificado EV cuesta miles de euros anuales y requiere validación notarial e inserción de token físico HSM en un servidor. Otorga "reputación inmediata" en los servidores de Microsoft.
   - Con firmas estándar o binarios de reciente compilación (cada vez que se lanza una nueva versión como `v0.3.8`), Microsoft SmartScreen considera que el archivo tiene "baja reputación acumulada" hasta que miles de usuarios de todo el mundo lo han descargado y ejecutado sin reportes de malware.
2. **Seguridad Criptográfica Nativa de Bentian ERP Bridge:**
   - Todo el software de Bentian cuenta con un sistema criptográfico de verificación asimétrica interna con curvas elípticas **Ed25519** y hashes **SHA-256** auditados. No contiene adware, telemetría invasiva ni componentes de terceros no verificados. El instalador es 100% seguro y de código abierto en sus componentes de integración.

---

## 2. Instrucciones Paso a Paso para Superar SmartScreen en Windows 10 y Windows 11

El usuario final o el técnico de soporte dispone de tres vías sencillas y seguras para ejecutar el instalador:

### Método A: Salto Directo desde la Ventana Azul (Recomendado - 2 clics)
Cuando aparezca la ventana azul de Microsoft Defender SmartScreen:

```
┌──────────────────────────────────────────────────────────────────┐
│  Windows protegió su PC                                      [X] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Microsoft Defender SmartScreen evitó el inicio de una           │
│  aplicación no reconocida. Si ejecuta esta aplicación,           │
│  su PC podría estar en riesgo.                                   │
│                                                                  │
│  <u>Más información</u>  <─── [1. PULSAR AQUÍ]                    │
│                                                                  │
│                                           ┌──────────────────┐   │
│                                           │  No ejecutar     │   │
│                                           └──────────────────┘   │
└──────────────────────────────────────────────────────────────────┘

                                 ▼  (La ventana se expande)

┌──────────────────────────────────────────────────────────────────┐
│  Windows protegió su PC                                      [X] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Aplicación: Bentian-Setup.exe (o Bentian-Setup-v0.3.8.exe)      │
│  Editor:     Cristian Jiménez Martínez / Bentian ERP Bridge      │
│                                                                  │
│  ┌─────────────────────────┐             ┌──────────────────┐   │
│  │ Ejecutar de todas formas│             │  No ejecutar     │   │
│  └─────────────────────────┘             └──────────────────┘   │
│               ▲                                                  │
│        [2. PULSAR AQUÍ]                                          │
└──────────────────────────────────────────────────────────────────┘
```

1. Haz clic sobre el texto subrayado **"Más información"** (*"More info"* en sistemas en inglés).
2. Se revelará la identidad del ejecutable y aparecerá el botón **"Ejecutar de todas formas"** (*"Run anyway"*).
3. Haz clic en **"Ejecutar de todas formas"**. El asistente de instalación arrancará con normalidad.

---

### Método B: Desbloqueo en Propiedades de Archivo (Específico Windows 11 y Smart App Control)
En Windows 11 (versiones 22H2, 23H2 y 24H2), Microsoft incluye **Smart App Control (SAC / Control Inteligente de Aplicaciones)**. Si SAC está en modo "Evaluación" o "Activado", puede bloquear la ejecución sin mostrar el botón "Ejecutar de todas formas" debido a la marca de procedencia de Internet (*Zone.Identifier: ZoneId=3*):

1. Abre el Explorador de Archivos de Windows 11 y localiza el instalador descargado (`Bentian-Setup.exe` o `Bentian-Setup-v0.3.8.exe`).
2. **Acceso a Propiedades en Windows 11:**
   - Selecciona el archivo y presiona la combinación rápida de teclado **`Alt + Enter`**.
   - *(Alternativa gráfica: Haz clic derecho, selecciona el icono de Propiedades al pie del menú o presiona `Shift + F10` -> **Propiedades**)*.
3. En la pestaña **General**, dirígete a la parte inferior (sección *Seguridad*):
   - Verás el aviso: *"Seguridad: Este archivo proviene de otro equipo y podría bloquearse para ayudar a proteger este equipo"*.
4. Marca la casilla **"Desbloquear"** (*Unblock*).
5. Pulsa **Aplicar** y luego **Aceptar**.
6. Ahora haz doble clic en el instalador: arrancará inmediatamente sin ningún bloqueo de SmartScreen ni de Smart App Control.

---

### Método C: Desbloqueo Automatizado vía PowerShell (Administradores de Sistemas)
Para despliegues masivos en redes locales o puestos gestionados sin interacción del usuario final:

Abre PowerShell y ejecuta:
```powershell
# 1. Eliminar el flujo NTFS Zone.Identifier del instalador legítimo de Bentian
Unblock-File -Path "$env:USERPROFILE\Downloads\Bentian-Setup*.exe"

# 2. Verificar que la marca de bloqueo web ha sido completamente eliminada
Get-Item -Path "$env:USERPROFILE\Downloads\Bentian-Setup*.exe" -Stream "Zone.Identifier" -ErrorAction SilentlyContinue

# 3. Lanzar el instalador oficial
Start-Process -FilePath "$env:USERPROFILE\Downloads\Bentian-Setup.exe"
```

---

## 3. Exclusiones en Antivirus y EDRs: Principio de Mínimo Privilegio

### 3.1 Prohibición Estricta y Advertencia de Seguridad EDR / CISO

> **PROHIBICIÓN ESTRICTA Y ADVERTENCIA DE SEGURIDAD EDR / CISO:**  
> **PROHIBIDO configurar exclusiones globales para cscript.exe o comodines \*.accdb / \*.laccdb en todo el sistema. Dichas prácticas debilitan las defensas del Endpoint corporativo y son rechazadas por suites EDR.**

Abrir excepciones globales sobre intérpretes del sistema operativo (`cscript.exe`, `wscript.exe`) o comodines de archivos en la raíz del disco habilita vectores de ataque y técnicas de evasión como *Living off the Land* (LotL) para agentes maliciosos ajenos a Bentian.

Bentian ERP Bridge opera bajo el **Principio de Mínimo Privilegio Real**: la seguridad del puesto de trabajo prevalece y todas las autorizaciones deben ser quirúrgicas, acotadas exclusivamente a las rutas de sus binarios legítimos, la carpeta de datos de la empresa y reglas condicionales por proceso padre.

---

### 3.2 Las 3 Únicas Reglas Permitidas en Endpoint

Para compatibilizar la protección continua del puesto con la concurrencia OLEDB de Factusol sin provocar bloqueos de archivo `.laccdb` ni errores `3045: Could not use ''; file already in use`, se autorizan **única y exclusivamente las siguientes 3 reglas**:

1. **Regla 1: Exclusión de proceso por binario de Bentian:**  
   `C:\Program Files\Bentian Agent\BentianAgent.exe` y `C:\Program Files\Bentian Agent\BentianTray.exe`  
   *(En instalaciones por usuario sin privilegios UAC: `%LOCALAPPDATA%\Bentian Agent\BentianAgent.exe` y `BentianTray.exe`)*.
2. **Regla 2: Exclusión de carpeta de datos específica de la empresa:**  
   `C:\Software DELSOL\Factusol\Datos\FS01\` *(o ruta UNC de red correspondiente, ej: `\\SERVIDOR\Datos\FS01\`)*.  
   **PROHIBIDO configurar comodines globales `*.accdb` ni `*.laccdb` en todo el disco.**
3. **Regla 3: Exclusión del perfil de aplicación en AppData:**  
   `%APPDATA%\Bentian Agent\` *(persistencia segura de `agent-config.json` y directorio rotativo de logs)*.

---

### 3.3 Tabla de Exclusiones de Mínimo Privilegio

| Regla | Elemento | Ruta Exacta / Ámbito | Tipo de Exclusión | Criterio de Seguridad EDR |
| :--- | :--- | :--- | :--- | :--- |
| **Regla 1** | **Binarios del Agente** | `C:\Program Files\Bentian Agent\BentianAgent.exe`<br>`C:\Program Files\Bentian Agent\BentianTray.exe` | **Proceso Específico** | Binarios oficiales firmados. Permite ejecución sin interferencia en llamadas locales. |
| **Regla 1 (Alt)** | **Binarios por Usuario** | `%LOCALAPPDATA%\Bentian Agent\BentianAgent.exe`<br>`%LOCALAPPDATA%\Bentian Agent\BentianTray.exe` | **Proceso Específico** | Binarios en instalaciones locales sin elevación de Administrador. |
| **Regla 2** | **Datos Factusol Empresa** | `C:\Software DELSOL\Factusol\Datos\FS01\` *(o `\\SERVIDOR\Datos\FS01\`)* | **Carpeta Específica** | **Únicamente la carpeta de la empresa**. Prohibido comodín `*.accdb` en disco. |
| **Regla 3** | **Perfil AppData** | `%APPDATA%\Bentian Agent\` | **Carpeta Específica** | Persistencia de configuración local y logs de diagnóstico rotativos. |
| **Transitoria** | **Actualizador Atómico** | `%TEMP%\bentian-updates\` | **Carpeta Transitoria** | Directorio transitorio desacoplado para sustitución atómica (`UpdateSwapper`). |
| **EDR / IOA** | **Subproceso OLEDB** | `Parent=BentianAgent.exe` → `cscript.exe adodb.js` | **Regla Condicional EDR** | Autoriza invocación de `adodb.js` **únicamente** cuando el proceso padre sea `BentianAgent.exe`. |

---

### 3.4 Arquitectura de Red Saliente HTTPS (Puerto TCP 443)

- **Tráfico 100% Saliente:** Bentian se comunica exclusivamente vía peticiones HTTPS salientes estándar (puerto TCP 443) hacia el endpoint de la tienda web (WooCommerce, PrestaShop, Shopify) y hacia la API central (`bridge.cristianjm.com`).
- **Cero Puertos Entrantes:** El agente no abre ni expone ningún puerto hacia el exterior o la red local. No requiere reglas NAT ni aperturas en el firewall perimetral.
- **Aislamiento Local:** El servidor web de administración escucha estrictamente en el bucle invertido local `127.0.0.1:39281`, inaccesible desde otros hosts de la red.

---

## 4. Guía de Configuración por Suite Antivirus y EDR

### 4.1 Microsoft Defender Antivirus (Seguridad de Windows)

#### Script de Automatización PowerShell (Ejecutar como Administrador):
Abre una consola de **PowerShell como Administrador** y ejecuta el siguiente script ajustado estrictamente a las 3 reglas de Mínimo Privilegio:

```powershell
Write-Host "Configurando exclusiones de Bentian ERP Bridge (Principio de Mínimo Privilegio)..." -ForegroundColor Cyan

# 1. Regla 1: Exclusión de procesos legítimos de Bentian por ruta absoluta
Add-MpPreference -ExclusionProcess "C:\Program Files\Bentian Agent\BentianAgent.exe"
Add-MpPreference -ExclusionProcess "C:\Program Files\Bentian Agent\BentianTray.exe"
Add-MpPreference -ExclusionProcess "$env:LOCALAPPDATA\Bentian Agent\BentianAgent.exe"
Add-MpPreference -ExclusionProcess "$env:LOCALAPPDATA\Bentian Agent\BentianTray.exe"

# 2. Regla 2: Exclusión de carpeta de datos específica de la empresa en Factusol
# NOTA: NUNCA añadir exclusión global de la extensión *.accdb ni de cscript.exe
Add-MpPreference -ExclusionPath "C:\Software DELSOL\Factusol\Datos\FS01"
# Si la base de datos se encuentra en un servidor o NAS en red local:
# Add-MpPreference -ExclusionPath "\\SERVIDOR\Datos\FS01"

# 3. Regla 3: Exclusión del perfil en AppData y actualización atómica
Add-MpPreference -ExclusionPath "$env:APPDATA\Bentian Agent"
Add-MpPreference -ExclusionPath "$env:TEMP\bentian-updates"

Write-Host "✓ Exclusiones de Mínimo Privilegio aplicadas con éxito en Windows Defender." -ForegroundColor Green
```

#### Comandos de Verificación y Auditoría:
```powershell
# Inspeccionar rutas excluidas
Get-MpPreference | Select-Object -ExpandProperty ExclusionPath

# Inspeccionar procesos excluidos
Get-MpPreference | Select-Object -ExpandProperty ExclusionProcess
```

#### Opción Manual vía Interfaz Gráfica:
1. Abre **Seguridad de Windows** desde el menú Inicio.
2. Ve a **Protección contra virus y amenazas** -> **Administrar la configuración**.
3. En **Exclusiones**, haz clic en **Agregar o quitar exclusiones**.
4. Pulsa **Agregar una exclusión**:
   - Selecciona **Proceso** y escribe:
     - `C:\Program Files\Bentian Agent\BentianAgent.exe`
     - `C:\Program Files\Bentian Agent\BentianTray.exe`
   - Selecciona **Carpeta** y añade:
     - `C:\Software DELSOL\Factusol\Datos\FS01` *(o carpeta concreta de tu empresa)*
     - `%APPDATA%\Bentian Agent`

---

### 4.2 CrowdStrike Falcon Sensor EDR

En puestos protegidos por **Falcon Sensor**, el motor heurístico supervisa scripts y procesos del sistema operativo. Para autorizar la conexión con Factusol bajo Mínimo Privilegio:

1. Inicia sesión en la **Falcon Console** con rol de Administrador de Políticas.
2. Dirígete a **Configuration** -> **Prevention Policies**:
   - Selecciona la política asignada al grupo de terminales con Factusol.
3. En la pestaña **Exclusions**:
   - **Machine Learning & Sensor Exclusions:**
     - Añadir exclusión por hash criptográfico **SHA-256** del binario publicado en cada release oficial de Bentian ERP Bridge.
   - **Path Exclusions:**
     - `\Device\HarddiskVolume*\Program Files\Bentian Agent\*`
     - `\Device\HarddiskVolume*\Users\*\AppData\Roaming\Bentian Agent\*`
     - `\Device\HarddiskVolume*\Software DELSOL\Factusol\Datos\FS01\*` *(Directorio específico de la empresa)*
   - **Process Exclusions:**
     - Proceso padre: `BentianAgent.exe`
     - Proceso secundario: `BentianTray.exe`
4. **Regla de Exclusión de Indicadores de Ataque (Custom IOA Exclusion):**
   - Para silenciar la alerta LotL sobre el motor OLEDB acotándola estrictamente al agente:
     - **Parent Image Filename:** `.*\\BentianAgent\.exe`
     - **Image Filename:** `.*\\cscript\.exe`
     - **Command Line:** `.*adodb\.js.*`
     - **Action:** Allow / No Alert.
5. Guarda la política; el sensor actualizará los puestos en menos de 60 segundos manteniendo protegido el resto del sistema.

---

### 4.3 SentinelOne (Singularity Platform EDR)

Para desplegar en terminales gestionados por **SentinelOne**:

1. En la consola de administración de SentinelOne, ve a **Sentinels** -> **Exclusions**.
2. **Path & Hash Exclusion:**
   - Tipo de exclusión: **Path & File Hash**.
   - Añade el hash **SHA-256** del release oficial de `BentianAgent.exe`.
   - Path: `C:\Program Files\Bentian Agent\BentianAgent.exe`.
3. **Interoperability / Behavioral AI Exclusion:**
   - Configura una regla de exclusión de interoperabilidad condicionada al proceso padre legítimo:
     - **Parent Process:** `C:\Program Files\Bentian Agent\BentianAgent.exe`
     - **Child Process / Script:** `cscript.exe` invocando `adodb.js`.
     - **Exclusion Mode:** Suppress alerts / Interoperability.
4. **Folder Exclusion:**
   - Añade la carpeta delimitada de Factusol (`C:\Software DELSOL\Factusol\Datos\FS01\`) con modo de exclusión *In-process & On-write*.

---

### 4.4 Bitdefender GravityZone Cloud & Total Security

1. En **Bitdefender GravityZone Console** (o interfaz local de Total Security):
2. Dirígete a **Policies** -> política activa -> **Antimalware** -> **Exclusions**:
   - **Folder Exclusion:**
     - `C:\Program Files\Bentian Agent\`
     - `%APPDATA%\Bentian Agent\`
     - Carpeta específica de datos de Factusol (`C:\Software DELSOL\Factusol\Datos\FS01\`). Marca *"Ambos (En acceso y Bajo demanda)"*.
   - **Process Exclusion:**
     - `C:\Program Files\Bentian Agent\BentianAgent.exe`
     - `C:\Program Files\Bentian Agent\BentianTray.exe`
3. En **Defensa contra amenazas avanzadas (Advanced Threat Defense - ATD)**:
   - Añade a la lista de aplicaciones de confianza por ruta absoluta `BentianAgent.exe` y `BentianTray.exe`.

---

### 4.5 Kaspersky (Endpoint Security / Small Office)

1. Abre la consola de Kaspersky y accede a **Configuración** -> **Configuración de seguridad** -> **Exclusiones y aplicaciones de confianza**.
2. En la sección **Exclusiones**, haz clic en **Agregar**:
   - `C:\Program Files\Bentian Agent\*`
   - `%APPDATA%\Bentian Agent\*`
   - Carpeta específica de datos de Factusol (ej: `C:\Software DELSOL\Factusol\Datos\FS01\*` o `\\SERVIDOR\Datos\FS01\*`). *(NUNCA exclusión global de `*.accdb`)*.
3. En la sección **Aplicaciones de confianza**, añade:
   - `C:\Program Files\Bentian Agent\BentianAgent.exe`
   - `C:\Program Files\Bentian Agent\BentianTray.exe`
   - Parámetros de confianza a activar:
     - [x] *"No supervisar la actividad de la aplicación"*
     - [x] *"No heredar restricciones del proceso principal"*
4. Haz clic en **Guardar**.

---

### 4.6 Avast Antivirus & AVG AntiVirus (Motor Gen Digital)

1. Abre la interfaz principal de **Avast** o **AVG**.
2. Haz clic en **Menú** -> **Opciones** (o **Configuración**).
3. En la pestaña **General**, selecciona la subsección **Excepciones**.
4. Haz clic en **Añadir excepción** y agrega una por una las rutas específicas:
   - `C:\Program Files\Bentian Agent\*`
   - `%APPDATA%\Bentian Agent\*`
   - `%TEMP%\bentian-updates\*`
   - Ruta completa de la base de datos de Factusol (ej. `C:\Software DELSOL\Factusol\Datos\FS01\*` o `\\SERVIDOR\Datos\FS01\*`).
5. En el menú lateral, dirígete a **Protección** -> **Escudo contra ransomware**:
   - Ve a **Aplicaciones bloqueadas y permitidas**.
   - Haz clic en **Permitir aplicación** e incluye explícitamente `C:\Program Files\Bentian Agent\BentianAgent.exe` y `BentianTray.exe`.
6. Reinicia el Agente de Bentian desde el icono de la bandeja del sistema.

---

## 5. Verificación de Funcionamiento tras Aplicar Exclusiones

Una vez configuradas las exclusiones:
1. Comprueba que el icono de **Bentian ERP Bridge** aparece en la bandeja del sistema (junto al reloj de Windows).
2. Haz clic derecho sobre el icono y selecciona **Abrir Panel de Control**.
3. Verifica que el estado de conexión con Factusol se muestra en color verde (**En Línea / Conectado**).
4. El archivo de registro en `%APPDATA%\Bentian Agent\logs\agent.log` debe mostrar:
   ```text
   [INFO] [FactusolService] Conexión OLEDB con base de datos establecida correctamente.
   [INFO] [FileWatcher] Monitor de cambios en *.accdb activo.
   ```
5. Si experimentas cualquier mensaje de bloqueo o necesitas asistencia técnica para desplegar exclusiones en Active Directory vía GPO, contacta directamente con el equipo de soporte técnico en `soporte@cristianjm.com`.
