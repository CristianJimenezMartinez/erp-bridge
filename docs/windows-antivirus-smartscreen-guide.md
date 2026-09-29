# Guía de Resolución de Windows Defender SmartScreen y Exclusiones de Antivirus
## Bentian ERP Bridge Agent — Guía de Operaciones en Producción

> **Documento Técnico de Soporte & Despliegue en Clientes**  
> **Área:** Compatibilidad con Windows 10/11, Windows Server y EDRs Corporativos  
> **Versión:** 1.0.0  
> **Fecha:** Septiembre 2026  
> **Afecta a:** `BentianAgent.exe`, `BentianTray.exe`, `Bentian-Setup-v*.exe`

---

## 1. ¿Por Qué Aparece la Pantalla Azul de SmartScreen?

Al descargar e iniciar por primera vez el instalador oficial (`Bentian-Setup-v0.3.1.exe`) o el ejecutable del agente en equipos con Windows 10, Windows 11 o Windows Server, el sistema operativo puede mostrar una ventana de alerta azul con el mensaje:

> **"Windows protegió su PC"**  
> *Microsoft Defender SmartScreen evitó el inicio de una aplicación no reconocida. Si ejecuta esta aplicación, su PC podría estar en riesgo.*

### El Mecanismo de Reputación de Microsoft SmartScreen
Microsoft Defender SmartScreen no analiza el código binario buscando virus en esta etapa: **evalúa la reputación histórica acumulada de la firma digital del ejecutable**.

1. **Certificados Estándar (OV) vs Certificados EV (Extended Validation):**
   - Un certificado EV cuesta miles de euros anuales y requiere validación notarial e inserción de token físico HSM en un servidor. Otorga "reputación inmediata" en los servidores de Microsoft.
   - Con firmas estándar o binarios de reciente compilación (cada vez que se lanza una nueva versión como `v0.3.1`), Microsoft SmartScreen considera que el archivo tiene "baja reputación acumulada" hasta que miles de usuarios de todo el mundo lo han descargado y ejecutado sin reportes de malware.
2. **Seguridad Criptográfica Nativa de Bentian ERP Bridge:**
   - Todo el software de Bentian cuenta con un sistema criptográfico de verificación asimétrica interna con curvas elípticas **Ed25519** y hashes **SHA-256** auditados. No contiene adware, telemetría invasiva ni componentes de terceros no verificados. El instalador es 100% seguro y de código abierto en sus componentes de integración.

---

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
│  Aplicación: Bentian-Setup-v0.3.1.exe                             │
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

1. Abre el Explorador de Archivos de Windows 11 y localiza el instalador descargado (`Bentian-Setup-v0.3.1.exe`).
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
# 1. Eliminar el flujo NTFS Zone.Identifier del instalador
Unblock-File -Path "$env:USERPROFILE\Downloads\Bentian-Setup-*.exe"

# 2. Verificar que la marca de bloqueo web ha sido completamente eliminada
Get-Item -Path "$env:USERPROFILE\Downloads\Bentian-Setup-*.exe" -Stream "Zone.Identifier" -ErrorAction SilentlyContinue

# 3. Lanzar el instalador
Start-Process -FilePath "$env:USERPROFILE\Downloads\Bentian-Setup-*.exe"
```

---

## 3. Lista Obligatoria de Exclusiones en Antivirus y EDRs

### 3.1 ¿Por Qué son Críticas las Exclusiones en el Agente Bentian?
Bentian ERP Bridge trabaja directamente con el motor de base de datos relacional de Factusol:
* **Lectura/Escritura Concurrente OLEDB:** Emplea el controlador Microsoft Access Database Engine (ACE/Jet OLEDB) a través del subproceso `cscript.exe` / `adodb.js`.
* **Archivos `.accdb` y Cerrojos `.laccdb` en Red Local o NAS:** Monitoriza en tiempo real los cambios en la base de datos de Factusol mediante *FileSystemWatcher* y sondeos *delta*. Si un antivirus analiza el fichero `.accdb` o el cerrojo de concurrencia `.laccdb` en cada escritura, provocará errores críticos `3045: Could not use ''; file already in use` o congelación de Factusol en caja física.
* **Auto-actualizador Atómico (`UpdateSwapper`):** Descarga binarios en `%TEMP%\bentian-updates\` y realiza reemplazos atómicos mediante `fs.renameSync`. Las suites heurísticas que bloquean la ejecución desde `%TEMP%` impedirán la actualización silenciosa del agente.

---

### 3.2 Lista Exacta de Carpetas, Archivos y Procesos a Excluir

| Elemento | Ruta Exacta / Nombre de Proceso | Tipo de Exclusión |
| :--- | :--- | :--- |
| **Configuración y Base Local** | `%APPDATA%\Bentian Agent\` *(o `C:\Users\*\AppData\Roaming\Bentian Agent\`)* | **Carpeta / Directorio** |
| **Logs de Operación** | `%APPDATA%\Bentian Agent\logs\` | **Carpeta / Directorio** |
| **Instalación Principal** | `C:\Program Files\Bentian Agent\` | **Carpeta / Directorio** |
| **Proceso Agente (Daemon)** | `C:\Program Files\Bentian Agent\BentianAgent.exe` | **Proceso / Aplicación** |
| **Proceso Bandeja del Sistema** | `C:\Program Files\Bentian Agent\BentianTray.exe` | **Proceso / Aplicación** |
| **Intérprete OLEDB Factusol** | `cscript.exe` *(invocado por `adodb.js`)* | **Proceso / Aplicación** |
| **Directorio de Actualizaciones** | `%TEMP%\bentian-updates\` | **Carpeta / Directorio** |
| **Base de Datos y Cerrojo Factusol** | Extensión `*.accdb` y `*.laccdb` en carpeta de datos local o de red (`\\SERVIDOR\Datos\*`) | **Extensiones `.accdb` / `.laccdb` y Carpeta** |

---

## 4. Guía de Configuración por Suite Antivirus

### 4.1 Microsoft Defender Antivirus (Seguridad de Windows)

#### Script de Automatización PowerShell (Ejecutar como Administrador):
Abre una consola de **PowerShell como Administrador** y pega el siguiente bloque:

```powershell
Write-Host "Configurando exclusiones de Bentian ERP Bridge en Microsoft Defender..." -ForegroundColor Cyan

# 1. Excluir directorios del Agente y registros
Add-MpPreference -ExclusionPath "$env:APPDATA\Bentian Agent"
Add-MpPreference -ExclusionPath "$env:APPDATA\Bentian Agent\logs"
Add-MpPreference -ExclusionPath "C:\Program Files\Bentian Agent"
Add-MpPreference -ExclusionPath "$env:TEMP\bentian-updates"

# 2. Excluir procesos ejecutables del agente y motor OLEDB
Add-MpPreference -ExclusionProcess "BentianAgent.exe"
Add-MpPreference -ExclusionProcess "BentianTray.exe"
Add-MpPreference -ExclusionProcess "cscript.exe"

# 3. Excluir extensiones de base de datos y archivos de cerrojo Factusol
Add-MpPreference -ExclusionExtension ".accdb"
Add-MpPreference -ExclusionExtension ".laccdb"

Write-Host "✓ Exclusiones aplicadas con éxito en Windows Defender." -ForegroundColor Green
```

#### Comandos de Verificación y Auditoría:
Para comprobar que Microsoft Defender ha registrado correctamente las exclusiones:
```powershell
# Inspeccionar rutas excluidas
Get-MpPreference | Select-Object -ExpandProperty ExclusionPath

# Inspeccionar procesos excluidos
Get-MpPreference | Select-Object -ExpandProperty ExclusionProcess

# Inspeccionar extensiones excluidas
Get-MpPreference | Select-Object -ExpandProperty ExclusionExtension
```

#### Opción Manual vía Interfaz Gráfica:
1. Abre **Seguridad de Windows** desde el menú Inicio.
2. Ve a **Protección contra virus y amenazas**.
3. En *Configuración de Protección contra virus y amenazas*, haz clic en **Administrar la configuración**.
4. Desplázate hacia abajo hasta **Exclusiones** y haz clic en **Agregar o quitar exclusiones**.
5. Pulsa **Agregar una exclusión**:
   - Selecciona **Carpeta** y añade:
     - `C:\Program Files\Bentian Agent`
     - `%APPDATA%\Bentian Agent`
   - Selecciona **Proceso** y escribe:
     - `BentianAgent.exe`
     - `BentianTray.exe`
     - `cscript.exe`
   - Selecciona **Tipo de archivo** y escribe:
     - `.accdb`
     - `.laccdb`

---

---

### 4.2 Kaspersky (Endpoint Security / Small Office / Total Security)

1. Abre la consola de Kaspersky y accede a **Configuración (icono de engranaje)**.
2. Entra en **Configuración de seguridad** -> **Exclusiones y aplicaciones de confianza**.
3. En la sección *Exclusiones*, haz clic en **Administrar exclusiones** -> **Agregar**:
   - `C:\Program Files\Bentian Agent\*`
   - `%APPDATA%\Bentian Agent\*`
   - `*.accdb` y `*.laccdb` (en la ruta de Factusol).
   - Componentes a marcar: *Antivirus de archivos, Control de aplicaciones, Prevención de intrusiones (HIPS)*.
4. En la sección **Aplicaciones de confianza**, añade:
   - `C:\Program Files\Bentian Agent\BentianAgent.exe`
   - `C:\Program Files\Bentian Agent\BentianTray.exe`
   - `C:\Windows\System32\cscript.exe` y `C:\Windows\SysWOW64\cscript.exe` *(vital para que el subproceso OLEDB `adodb.js` no sea interceptado por el motor de prevención de exploits)*.
   - Parámetros de confianza a activar:
     - [x] *"No supervisar la actividad de la aplicación"*
     - [x] *"No heredar restricciones del proceso principal"*
     - [x] *"Permitir interactuar con la interfaz del sistema"*
5. Haz clic en **Guardar**.
6. *(Administradores de Red vía CLI - Kaspersky Endpoint Security):*
   ```cmd
   kescli --manage-exclusions --add --path "C:\Program Files\Bentian Agent\*"
   kescli --manage-exclusions --add --path "%APPDATA%\Bentian Agent\*"
   ```

---

### 4.3 Bitdefender (GravityZone Cloud / Total Security)

1. Abre el panel de Bitdefender y pulsa en la sección **Protección**.
2. En el módulo **Antivirus**, haz clic en **Abrir** / **Ajustes** -> pestaña **Exclusiones**:
   - Haz clic en **Añadir exclusión**: selecciona Carpeta y añade `C:\Program Files\Bentian Agent` y `%APPDATA%\Bentian Agent`. Asegúrate de que la casilla *"Ambos (En acceso y Bajo demanda)"* esté seleccionada.
   - Añadir exclusión por extensión: `.accdb` y `.laccdb`.
3. En **Defensa contra amenazas avanzadas (Advanced Threat Defense - ATD)**:
   - Añade a la lista de excepciones `BentianAgent.exe`, `BentianTray.exe` y `cscript.exe`. Esto evita que el monitor heurístico de memoria bloquee la comunicación OLEDB de Factusol.
4. En entornos corporativos gestionados por **Bitdefender GravityZone Console**:
   - Dirígete a **Policies** -> tu política activa -> **Antimalware** -> **Exclusions**:
     - *Folder Exclusion:* `C:\Program Files\Bentian Agent\` y `*:\Users\*\AppData\Roaming\Bentian Agent\*`.
     - *Process Exclusion:* `BentianAgent.exe` y `BentianTray.exe`.
     - *Extension Exclusion:* `accdb` y `laccdb`.
   - En **Advanced Anti-Exploit**: desmarcar intercepción sobre scripts de base de datos en hosts autorizados de Factusol.

---

### 4.4 CrowdStrike Falcon EDR

En entornos corporativos donde los puestos de facturación y servidores están controlados por **Falcon Sensor**, el motor heurístico de aprendizaje automático suele categorizar la invocación de `cscript.exe` ejecutando `adodb.js` como una técnica sospechosa de *Living off the Land (LotL)*. Para garantizar la operativa ininterrumpida sin comprometer la seguridad del endpoint:

1. Inicia sesión en la **Falcon Console** con rol de Administrador de Políticas.
2. Dirígete a **Configuration** -> **Prevention Policies**:
   - Selecciona la política asignada al grupo de terminales con Factusol.
3. En la pestaña **Exclusions**:
   - **Machine Learning & Sensor Exclusions:**
     - Añadir exclusión por hash **SHA-256** del binario publicado en cada release de Bentian ERP Bridge.
   - **Path Exclusions:**
     - `\Device\HarddiskVolume*\Program Files\Bentian Agent\*`
     - `\Device\HarddiskVolume*\Users\*\AppData\Roaming\Bentian Agent\*`
     - `\Device\HarddiskVolume*\*\*.accdb`
     - `\Device\HarddiskVolume*\*\*.laccdb`
   - **Process Exclusions:**
     - Proceso padre: `BentianAgent.exe`
     - Proceso secundario: `BentianTray.exe`
4. **Regla de Exclusión de Indicadores de Ataque (Custom IOA Exclusion):**
   - Para silenciar la alerta LotL sobre el motor OLEDB:
     - **Parent Image Filename:** `.*\\BentianAgent\.exe`
     - **Image Filename:** `.*\\cscript\.exe`
     - **Command Line:** `.*adodb\.js.*`
     - **Action:** Allow / No Alert.
5. Guarda la política; el sensor actualizará los puestos en menos de 60 segundos.

---

### 4.5 Avast Antivirus & AVG AntiVirus (Motor Gen Digital)

Avast y AVG comparten el mismo motor de detección y sistema de escudos en tiempo real (*File Shield* y *Behavior Shield / Escudo de Comportamiento*). Si no se configuran excepciones, el análisis en tiempo real puede bloquear las llamadas OLEDB o aislar el actualizador atómico en `%TEMP%`.

1. Abre la interfaz principal de **Avast** o **AVG**.
2. Haz clic en **Menú** (esquina superior derecha, icono de tres líneas o engranaje) -> **Opciones** (o **Configuración**).
3. En la pestaña **General**, selecciona la subsección **Excepciones**.
4. Haz clic en el botón verde **Añadir excepción** y agrega una por una las siguientes rutas:
   - `C:\Program Files\Bentian Agent\*`
   - `%APPDATA%\Bentian Agent\*`
   - `%TEMP%\bentian-updates\*`
   - Ruta completa de la base de datos de Factusol (ej. `C:\Factusol\Datos\*` o `\\SERVIDOR\Datos\*`).
5. Pulsa en **Añadir excepción avanzada** -> **Filtros / Extensiones** y añade:
   - `*.accdb`
   - `*.laccdb`
6. En el menú lateral, dirígete a **Protección** -> **Escudo contra ransomware** (o *Ransomware Shield*):
   - Ve a **Aplicaciones bloqueadas y permitidas**.
   - Si `BentianAgent.exe` o `cscript.exe` aparecen en "Bloqueadas", haz clic en los tres puntos y selecciona **Permitir**.
   - Haz clic en **Permitir aplicación** e incluye explícitamente `C:\Program Files\Bentian Agent\BentianAgent.exe`.
7. Reinicia el Agente de Bentian desde el icono de la bandeja del sistema.

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
