program SlimsteMensTimer;

uses
  System.StartUpCopy,
  FMX.Forms,
  MainFrm in 'src\MainFrm.pas' {MainForm};

{$R *.res}

begin
  Application.Initialize;
  Application.CreateForm(TMainForm, MainForm);
  Application.Run;
end.
