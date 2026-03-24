#define MyAppName      "Slimste Mens Timer Server"
#define MyAppExeName   "SlimsteMensTimerServer.exe"
#define MyAppServiceName "SlimsteMensTimerSvc"
#define MyAppVersion   "1.0.0"   ; overridden at compile time: /DMyAppVersion=v1.2.3
#define MyPublishDir   SourcePath + "\..\publish\win-x64"

[Setup]
AppId={{4A7B2C1E-9F3D-4E6A-B8C0-1D5E7F2A3B4C}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher=Roald van Doorn
DefaultDirName={autopf}\SlimsteMensTimerServer
DefaultGroupName=Slimste Mens Timer Server
OutputDir={#SourcePath}
OutputBaseFilename=SlimsteMensTimerServer-{#MyAppVersion}-Setup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "{#MyPublishDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Open Lobby"; Filename: "{app}\lobby.url"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"

[Run]
; Register Windows Service
Filename: "sc.exe"; Parameters: "create {#MyAppServiceName} binPath= ""{app}\{#MyAppExeName}"" start= auto DisplayName= ""{#MyAppName}"""; Flags: runhidden waituntilterminated; StatusMsg: "Registering Windows service..."
; Start the service
Filename: "sc.exe"; Parameters: "start {#MyAppServiceName}"; Flags: runhidden waituntilterminated; StatusMsg: "Starting service..."
; Open firewall port 5000
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""{#MyAppName}"" dir=in action=allow protocol=TCP localport=5000"; Flags: runhidden waituntilterminated; StatusMsg: "Opening firewall port 5000..."

[UninstallRun]
; Stop and remove Windows Service
Filename: "sc.exe"; Parameters: "stop {#MyAppServiceName}"; Flags: runhidden waituntilterminated
Filename: "sc.exe"; Parameters: "delete {#MyAppServiceName}"; Flags: runhidden waituntilterminated
; Remove firewall rule
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName}"""; Flags: runhidden waituntilterminated

[Code]
{ Create lobby.url internet shortcut so the Start Menu entry opens the browser }
procedure CurStepChanged(CurStep: TSetupStep);
var
  Lines: TStringList;
begin
  if CurStep = ssPostInstall then
  begin
    Lines := TStringList.Create;
    try
      Lines.Add('[InternetShortcut]');
      Lines.Add('URL=http://localhost:5000/lobby.html');
      Lines.SaveToFile(ExpandConstant('{app}\lobby.url'));
    finally
      Lines.Free;
    end;
  end;
end;
