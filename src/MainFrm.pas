unit MainFrm;

interface

uses
  System.SysUtils, System.Types, System.UITypes, System.Classes,
  System.Threading,
  FMX.Types, FMX.Controls, FMX.Forms, FMX.Graphics, FMX.Dialogs,
  FMX.Objects, FMX.StdCtrls, FMX.Controls.Presentation, FMX.DialogService,
  ScoreManager, ServerClient;

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
    mnuJoinGame: TText;
    mnuLeaveGame: TText;
    lblStatus: TLabel;
    procedure FormCreate(Sender: TObject);
    procedure tmrCountdownTimer(Sender: TObject);
    procedure txtMinus20Click(Sender: TObject);
    procedure txtStartStopClick(Sender: TObject);
    procedure txtPlus20Click(Sender: TObject);
    procedure btnMenuClick(Sender: TObject);
    procedure mnuResetClick(Sender: TObject);
    procedure mnuSetScoreClick(Sender: TObject);
    procedure mnuExitClick(Sender: TObject);
    procedure mnuJoinGameClick(Sender: TObject);
    procedure mnuLeaveGameClick(Sender: TObject);
  private
    FScoreManager: IScoreManager;
    FServerClient: IServerClient;
    FStatusPoll:   TTimer;
    procedure tmrStatusPollTimer(Sender: TObject);
    procedure StartManualJoin;
    procedure DoJoin(const AJoinUrl, APlayerName: string);
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
  FServerClient := TServerClient.Create;
  lblScore.Text := FScoreManager.Score.ToString;

  FStatusPoll          := TTimer.Create(Self);
  FStatusPoll.Interval := 5000;
  FStatusPoll.OnTimer  := tmrStatusPollTimer;
  FStatusPoll.Enabled  := True;
end;

// ── Status poll ───────────────────────────────────────────────────────────────

procedure TMainForm.tmrStatusPollTimer(Sender: TObject);
begin
  if FServerClient.IsConnected then
    lblStatus.Text := 'Online'
  else if FServerClient.SessionId <> '' then
    lblStatus.Text := 'Offline'
  else
    lblStatus.Text := '';
end;

// ── Countdown timer ───────────────────────────────────────────────────────────

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

// ── Score buttons ─────────────────────────────────────────────────────────────

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

// ── Menu ──────────────────────────────────────────────────────────────────────

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

// ── Join / Leave ──────────────────────────────────────────────────────────────

procedure TMainForm.mnuJoinGameClick(Sender: TObject);
begin
  pnlMenu.Visible := False;
  // Offer scan vs manual entry.  "Ja" = Scannen (D4), "Nee" = Code invoeren.
  TDialogService.MessageDialog(
    'Hoe wil je deelnemen?'#10'Ja = QR-scannen   Nee = Code invoeren',
    TMsgDlgType.mtConfirmation,
    [TMsgDlgBtn.mbYes, TMsgDlgBtn.mbNo, TMsgDlgBtn.mbCancel],
    TMsgDlgBtn.mbNo, 0,
    procedure(const AResult: TModalResult)
    begin
      if AResult = mrYes then
        // D4: QR scan will be wired up here
        TDialogService.ShowMessage('QR-scannen wordt geïmplementeerd in een latere versie.')
      else if AResult = mrNo then
        StartManualJoin;
    end);
end;

procedure TMainForm.StartManualJoin;
var
  UrlValues: array of string;
begin
  SetLength(UrlValues, 1);
  UrlValues[0] := '';
  TDialogService.InputQuery(
    'Deelnemen aan spel',
    ['Voer de join-URL in (bijv. http://192.168.1.5:5000/join/XK7P3Q):'],
    UrlValues,
    procedure(const AResult: TModalResult; const AValues: array of string)
    var
      JoinUrl: string;
      NameValues: array of string;
    begin
      if AResult <> mrOk then Exit;
      JoinUrl := AValues[0].Trim;
      if JoinUrl.IsEmpty then Exit;

      SetLength(NameValues, 1);
      NameValues[0] := '';
      TDialogService.InputQuery(
        'Deelnemen aan spel',
        ['Voer je naam in:'],
        NameValues,
        procedure(const AResult2: TModalResult; const AValues2: array of string)
        var
          PlayerName: string;
        begin
          if AResult2 <> mrOk then Exit;
          PlayerName := AValues2[0].Trim;
          if PlayerName.IsEmpty then Exit;
          DoJoin(JoinUrl, PlayerName);
        end);
    end);
end;

procedure TMainForm.DoJoin(const AJoinUrl, APlayerName: string);
begin
  TTask.Run(procedure
  begin
    FServerClient.JoinSession(AJoinUrl, APlayerName);
    TThread.Queue(nil, procedure
    begin
      if FServerClient.IsConnected then
      begin
        FScoreManager        := TServerAwareScoreManager.Create(
                                  TScoreManager.Create, FServerClient);
        mnuJoinGame.Visible  := False;
        mnuLeaveGame.Visible := True;
        lblStatus.Text       := 'Online';
      end
      else
        TDialogService.ShowMessage(
          'Kan geen verbinding maken met de server.'#10'Controleer de URL en probeer opnieuw.');
    end);
  end);
end;

procedure TMainForm.mnuLeaveGameClick(Sender: TObject);
begin
  FServerClient.LeaveSession;
  FScoreManager        := TScoreManager.Create;
  mnuJoinGame.Visible  := True;
  mnuLeaveGame.Visible := False;
  lblStatus.Text       := '';
  pnlMenu.Visible      := False;
end;

end.
