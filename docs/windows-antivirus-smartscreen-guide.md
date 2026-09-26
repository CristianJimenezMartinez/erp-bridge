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

## 2. Instrucciones Paso a Paso para Superar SmartScreen

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

### Método B: Desbloqueo Preventivo en Propiedades del Archivo
Si el navegador web (Microsoft Edge, Google Chrome) descargó el archivo y le asignó la marca de seguridad de zona de Internet (*Zone.Identifier NTFS Alternate Data Stream*):

1. Abre el Explorador de Archivos y localiza el instalador descargado (`Bentian-Setup-v0.3.1.exe`).
2. Haz clic derecho sobre el archivo y selecciona **Propiedades**.
3. En la pestaña **General**, dirígete a la parte inferior (sección *Seguridad*).
4. Verás el aviso: *"Seguridad: Este archivo proviene de otro equipo y podría bloquearse para ayudar a proteger este equipo"*.
5. Marca la casilla **"Desbloquear"** (*Unblock*).
6. Pulsa **Aplicar** y luego **Aceptar**.
7. Ahora haz doble clic en el instalador: se ejecutará directamente sin ninguna advertencia.

---

### Método C: Desbloqueo Automatizado vía PowerShell (Administradores de Sistemas)
Si eres un técnico de sistemas o estás desplegando el agente en múltiples terminales de una red local:

Abre PowerShell y ejecuta:
```powershell
Unblock-File -Path "$env:USERPROFILE\Downloads\Bentian-Setup-*.exe"
Start-Process -FilePath "$env:USERPROFILE\Downloads\Bentian-Setup-*.exe"
```

---

## 3. Lista Obligatoria de Exclusiones en Antivirus y EDRs

### 3.1 ¿Por Qué son Críticas las Exclusiones en el Agente Bentian?
Bentian ERP Bridge trabaja directamente con el motor de base de datos relacional de Factusol:
* **Lectura/Escritura Concurrente OLEDB:** Emplea el controlador Microsoft Access Database Engine (ACE/Jet OLEDB) a través del subproceso `cscript.exe` / `adodb.js`.
* **Archivos `.accdb` en Red Local o NAS:** Monitoriza en tiempo real los cambios en la base de datos de Factusol mediante *FileSystemWatcher* y sondeos *delta*. Si un antivirus bloquea o analiza el fichero `.accdb` cada milisegundo, provocará errores de concurrencia `3045: Could not use ''; file already in use` o ralentizaciones en la facturación física.
* **Auto-actualizador Atómico (`UpdateSwapper`):** Descarga binarios en `%TEMP%\bentian-updates\` y realiza reemplazos atómicos mediante `fs.renameSync`. Las suites heurísticas que bloquean la ejecución desde `%TEMP%` impedirán la actualización silenciosa del agente.

---

### 3.2 Lista Exacta de Carpetas, Archivos y Procesos a Excluir

| Elemento | Ruta Exacta / Nombre de Proceso | Tipo de Exclusión |
| :--- | :--- | :--- |
| **Configuración y Base Local** | `%APPDATA%\Bentian Agent\` *(o `C:\Users\*\AppData\Roaming\Bentian Agent\`)* | **Carpeta / Directorio** |
| **Instalación Principal** | `C:\Program Files\Bentian Agent\` | **Carpeta / Directorio** |
| **Proceso Agente (Daemon)** | `C:\Program Files\Bentian Agent\BentianAgent.exe` | **Proceso / Aplicación** |
| **Proceso Bandeja del Sistema** | `C:\Program Files\Bentian Agent\BentianTray.exe` | **Proceso / Aplicación** |
| **Directorio de Actualizaciones** | `%TEMP%\bentian-updates\` | **Carpeta / Directorio** |
| **Base de Datos Factusol** | Ruta del archivo de datos (ej: `*.accdb` en `C:\Software DELSOL\Factusol\Datos\` o en red `\\SERVIDOR\Datos\*.accdb`) | **Extensión `.accdb` y Carpeta** |

---

## 4. Guía de Configuración por Suite Antivirus

### 4.1 Microsoft Defender Antivirus (Seguridad de Windows)

#### Opción Rápida (Script PowerShell como Administrador):
Abre una consola de **PowerShell como Administrador** y pega el siguiente bloque:

```powershell
Write-Host "Configurando exclusiones de Bentian ERP Bridge en Microsoft Defender..." -ForegroundColor Cyan

# 1. Excluir directorios del Agente
Add-MpPreference -ExclusionPath "$env:APPDATA\Bentian Agent"
Add-MpPreference -ExclusionPath "C:\Program Files\Bentian Agent"
Add-MpPreference -ExclusionPath "$env:TEMP\bentian-updates"

# 2. Excluir procesos ejecutables
Add-MpPreference -ExclusionProcess "BentianAgent.exe"
Add-MpPreference -ExclusionProcess "BentianTray.exe"

# 3. Excluir extensión de base de datos Factusol para evitar bloqueos OLEDB
Add-MpPreference -ExclusionExtension ".accdb"

Write-Host "✓ Exclusiones aplicadas con éxito en Windows Defender." -ForegroundColor Green
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

---

### 4.2 Kaspersky (Endpoint Security / Total Security / Plus)

1. Abre la consola de Kaspersky y accede a **Configuración (icono de engranaje)**.
2. Entra en **Configuración de seguridad** -> **Exclusiones y aplicaciones de confianza**.
3. En la sección *Exclusiones*, haz clic en **Administrar exclusiones** -> **Agregar**.
4. Especifica el archivo o carpeta:
   - `C:\Program Files\Bentian Agent\*`
   - `%APPDATA%\Bentian Agent\*`
5. Marca todas las casillas de componentes: *Antivirus de archivos, Control de aplicaciones, Prevención de intrusiones*.
6. En la sección **Aplicaciones de confianza**, añade:
   - `C:\Program Files\Bentian Agent\BentianAgent.exe`
   - `C:\Program Files\Bentian Agent\BentianTray.exe`
   - Marca: *"No supervisar la actividad de la aplicación"*, *"No heredar restricciones"* y *"Permitir interactuar con la interfaz del sistema"*.
7. Haz clic en **Guardar**.

---

### 4.3 Bitdefender (GravityZone Cloud / Total Security)

1. Abre el panel de Bitdefender y pulsa en la sección **Protección**.
2. En el módulo **Antivirus**, haz clic en **Abrir** / **Ajustes** -> pestaña **Exclusiones**.
3. Haz clic en **Añadir exclusión**:
   - Selecciona **Carpeta**: examina y selecciona `C:\Program Files\Bentian Agent` y `%APPDATA%\Bentian Agent`. Asegúrate de que la casilla *"Ambos (En acceso y Bajo demanda)"* esté seleccionada.
4. En **Defensa contra amenazas avanzadas (Advanced Threat Defense)**:
   - Añade a la lista de excepciones `BentianAgent.exe` y `BentianTray.exe`.
5. En entornos gestionados por **Bitdefender GravityZone**:
   - En la consola Cloud, dirígete a **Policies** -> tu política activa -> **Antimalware** -> **Exclusions**.
   - Tipo de exclusión: *Folder* -> `C:\Program Files\Bentian Agent\` y `*:\Users\*\AppData\Roaming\Bentian Agent\`.
   - Tipo de exclusión: *Process* -> `BentianAgent.exe`.

---

### 4.4 CrowdStrike Falcon EDR

Para entornos corporativos donde los puestos están controlados por Falcon Sensor:

1. Inicia sesión en la **Falcon Console** con rol de Administrador de Políticas.
2. Dirígete a **Configuration** -> **Prevention Policies**.
3. Selecciona la política asignada al grupo de terminales con Factusol.
4. En la pestaña **Exclusions**:
   - **Machine Learning & Sensor Exclusions:**
     - Añadir exclusión por hash SHA-256 del binario publicado en la release (o firma del editor).
   - **Path Exclusions:**
     - `\Device\HarddiskVolume*\Program Files\Bentian Agent\*`
     - `\Device\HarddiskVolume*\Users\*\AppData\Roaming\Bentian Agent\*`
5. En **Process Exclusions**:
   - Proceso: `BentianAgent.exe`
   - Proceso secundario: `BentianTray.exe`
6. Guarda la política; el sensor actualizará los puestos en menos de 60 segundos.

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
5. Si experimentas cualquier mensaje de bloqueo o necesitas asistencia técnica para desplegar exclusiones en Active Directory vía GPO, contacta directamente con el equipo de soporte técnico en `soporte@bentian.es`.
