#define MyAppName "Bentian Agent"
#ifndef AppVersion
  #define AppVersion "0.1.0"
#endif
#define MyAppPublisher "Bentian"
#define MyAppURL "https://bentian.es"
#define MyAppExeName "BentianAgent.exe"

[Setup]
AppId={{8B23F40E-3F15-4D1E-97C5-C36B286E9559}
AppName={#MyAppName}
AppVersion={#AppVersion}
AppVerName={#MyAppName} v{#AppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
OutputDir={#OutputDir}
OutputBaseFilename=Bentian-Setup-v{#AppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
SetupIconFile={#SourceDir}\icon.ico
UninstallDisplayIcon={app}\icon.ico
LicenseFile=EULA.txt

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce
Name: "autostart"; Description: "Iniciar Bentian Agent automáticamente al encender el equipo"; GroupDescription: "Opciones de Inicio:"; Flags: checkedonce

[Files]
Source: "{#SourceDir}\BentianAgent.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\BentianTray.exe"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "{#SourceDir}\icon.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\adodb.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\agent-config.json"; DestDir: "{app}"; Flags: onlyifdoesntexist

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\icon.ico"
Name: "{group}\Configurar Factusol"; Filename: "{app}\{#MyAppExeName}"; Parameters: "set-db"; IconFilename: "{app}\icon.ico"
Name: "{group}\Configurar Servidor API"; Filename: "{app}\{#MyAppExeName}"; Parameters: "set-api"; IconFilename: "{app}\icon.ico"
Name: "{group}\Activar Licencia {#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Parameters: "activate"; IconFilename: "{app}\icon.ico"
Name: "{group}\Comprobar Estado"; Filename: "{app}\{#MyAppExeName}"; Parameters: "status"; IconFilename: "{app}\icon.ico"
Name: "{group}\Desinstalar {#MyAppName}"; Filename: "{uninstallexe}"; IconFilename: "{app}\icon.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "BentianAgent"; ValueData: """{app}\{#MyAppExeName}"" start"; Flags: uninsdeletevalue; Tasks: autostart
; Registrar AppUserModelId oficial para que Windows 10/11 permita notificaciones Toast
Root: HKCU; Subkey: "Software\Classes\AppUserModelId\Bentian.ERPBridge.Agent"; ValueType: string; ValueName: "DisplayName"; ValueData: "Bentian ERP Bridge"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\AppUserModelId\Bentian.ERPBridge.Agent"; ValueType: string; ValueName: "IconUri"; ValueData: "{app}\icon.ico"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\Bentian.ERPBridge.Agent"; ValueType: dword; ValueName: "ShowInActionCenter"; ValueData: 1; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\Bentian.ERPBridge.Agent"; ValueType: dword; ValueName: "Enabled"; ValueData: 1; Flags: uninsdeletekey

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Abrir Bentian Agent y configurar Factusol"; Flags: nowait postinstall skipifsilent runhidden

