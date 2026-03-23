unit MainFrm;

interface

uses
  System.SysUtils, System.Types, System.UITypes, System.Classes,
  FMX.Types, FMX.Controls, FMX.Forms, FMX.Graphics, FMX.Dialogs,
  FMX.Objects, FMX.StdCtrls, FMX.Controls.Presentation, FMX.DialogService,
  ScoreManager;

type
  TMainForm = class(TForm)
    rectBackground: TRectangle;
    lblScore: TLabel;
    btnMinus20: TCircle;
    txtMinus20: TText;
    btnStartStop: TCircle;
    txtStartStop: TText;
    btnPlus20: TCircle;
    txtPlus20: TText;
    tmrCountdown: TTimer;
    btnMenu: TRectangle;
    txtMenu: TText;
    pnlMenu: TRectangle;
    mnuReset: TText;
    mnuSetScore: TText;
    mnuExit: TText;
    procedure FormCreate(Sender: TObject);
    procedure tmrCountdownTimer(Sender: TObject);
    procedure txtMinus20Click(Sender: TObject);
    procedure txtStartStopClick(Sender: TObject);
    procedure txtPlus20Click(Sender: TObject);
    procedure btnMenuClick(Sender: TObject);
    procedure mnuResetClick(Sender: TObject);
    procedure mnuSetScoreClick(Sender: TObject);
    procedure mnuExitClick(Sender: TObject);
  private
    FScoreManager: IScoreManager;
  public
    { Public declarations }
  end;

var
  MainForm: TMainForm;

implementation

{$R *.fmx}

procedure TMainForm.FormCreate(Sender: TObject);
begin
  FScoreManager := TScoreManager.Create;
  lblScore.Text := FScoreManager.Score.ToString;
end;

procedure TMainForm.tmrCountdownTimer(Sender: TObject);
begin
  FScoreManager.Decrease(1);
  if FScoreManager.Score <= 0 then
  begin
    tmrCountdown.Enabled := False;
    txtStartStop.Text := 'Start';
  end;
  lblScore.Text := FScoreManager.Score.ToString;
end;

procedure TMainForm.txtStartStopClick(Sender: TObject);
begin
  tmrCountdown.Enabled := not tmrCountdown.Enabled;
  if tmrCountdown.Enabled then
    txtStartStop.Text := 'Stop'
  else
    txtStartStop.Text := 'Start';
end;

procedure TMainForm.txtMinus20Click(Sender: TObject);
begin
  FScoreManager.Decrease(20);
  lblScore.Text := FScoreManager.Score.ToString;
end;

procedure TMainForm.txtPlus20Click(Sender: TObject);
begin
  FScoreManager.Increase(20);
  lblScore.Text := FScoreManager.Score.ToString;
end;

procedure TMainForm.btnMenuClick(Sender: TObject);
begin
  pnlMenu.Visible := not pnlMenu.Visible;
end;

procedure TMainForm.mnuResetClick(Sender: TObject);
begin
  FScoreManager.Reset;
  lblScore.Text := FScoreManager.Score.ToString;
  tmrCountdown.Enabled := False;
  txtStartStop.Text := 'Start';
  pnlMenu.Visible := False;
end;

procedure TMainForm.mnuSetScoreClick(Sender: TObject);
var
  Values: array of string;
begin
  SetLength(Values, 1);
  Values[0] := '';
  TDialogService.InputQuery('Score instellen', ['Voer een getal in (0-1000):'], Values,
    procedure(const AResult: TModalResult; const AValues: array of string)
    var
      NewScore: Integer;
    begin
      if (AResult = mrOk) and TryStrToInt(AValues[0], NewScore)
        and (NewScore >= ScoreMin) and (NewScore <= ScoreMax) then
      begin
        FScoreManager.SetScore(NewScore);
        lblScore.Text := FScoreManager.Score.ToString;
        pnlMenu.Visible := False;
      end;
    end);
end;

procedure TMainForm.mnuExitClick(Sender: TObject);
begin
  Application.Terminate;
end;

end.
