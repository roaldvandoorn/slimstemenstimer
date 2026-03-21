unit MainFrm;

interface

uses
  System.SysUtils, System.Types, System.UITypes, System.Classes, System.Math,
  FMX.Types, FMX.Controls, FMX.Forms, FMX.Graphics, FMX.Dialogs,
  FMX.Objects, FMX.StdCtrls, FMX.Controls.Presentation;

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
    procedure FormCreate(Sender: TObject);
    procedure tmrCountdownTimer(Sender: TObject);
    procedure txtMinus20Click(Sender: TObject);
    procedure txtStartStopClick(Sender: TObject);
    procedure txtPlus20Click(Sender: TObject);
  private
    FScore: Integer;
  public
    { Public declarations }
  end;

var
  MainForm: TMainForm;

implementation

{$R *.fmx}

procedure TMainForm.FormCreate(Sender: TObject);
begin
  FScore := 60;
  lblScore.Text := FScore.ToString;
end;

procedure TMainForm.tmrCountdownTimer(Sender: TObject);
begin
  Dec(FScore);
  if FScore <= 0 then
  begin
    FScore := 0;
    tmrCountdown.Enabled := False;
    txtStartStop.Text := 'Start';
  end;

  lblScore.Text := FScore.ToString;
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
  FScore := Max(0, FScore - 20);
  lblScore.Text := FScore.ToString;
end;

procedure TMainForm.txtPlus20Click(Sender: TObject);
begin
  FScore := FScore + 20;
  lblScore.Text := FScore.ToString;
end;

end.
