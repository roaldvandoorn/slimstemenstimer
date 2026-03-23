program SlimsteMensTimer;

uses
  System.StartUpCopy,
  FMX.Forms,
  MainFrm in 'src\MainFrm.pas' {MainForm},
  ScoreManager in 'src\ScoreManager.pas',
  ServerClient in 'src\ServerClient.pas',
  ScannerFrm in 'src\ScannerFrm.pas' {ScannerForm};

{$R *.res}

begin
  Application.Initialize;
  Application.CreateForm(TMainForm, MainForm);
  Application.Run;
end.
