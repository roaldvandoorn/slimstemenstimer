unit ServerClient;

interface

uses
  System.SysUtils, System.Classes, System.Net.HttpClient, System.Net.URLClient,
  System.Threading, System.JSON,
  FMX.Types,
  ScoreManager;

type
  // ── IServerClient ─────────────────────────────────────────────────────────
  //
  // JoinSession is synchronous and blocking — call it from a background
  // thread (TTask.Run) so the UI stays responsive.  Check IsConnected
  // afterwards to determine whether the join succeeded.
  //
  // PushScore and the heartbeat run asynchronously (TTask.Run internally).
  // ──────────────────────────────────────────────────────────────────────────
  IServerClient = interface
    ['{B4C5D6E7-F8A9-4B0C-1D2E-3F4A5B6C7D8E}']
    procedure JoinSession(const AJoinUrl, APlayerName: string);
    procedure LeaveSession;
    procedure PushScore(AScore: Integer);
    function  IsConnected: Boolean;
    function  GetPlayerName: string;
    function  GetSessionId: string;
    property  PlayerName: string read GetPlayerName;
    property  SessionId:  string read GetSessionId;
  end;

  // ── TServerClient ─────────────────────────────────────────────────────────

  TServerClient = class(TInterfacedObject, IServerClient)
  private const
    MaxFailures = 3;
    HeartbeatMs = 15000;
  private
    FBaseUrl:    string;
    FSessionId:  string;
    FPlayerId:   string;
    FPlayerName: string;
    FConnected:  Boolean;
    FFailCount:  Integer;
    FHeartbeat:  TTimer;
    procedure HeartbeatTick(Sender: TObject);
    procedure RecordSuccess;
    procedure RecordFailure;
    function  BuildPlayerUrl: string;
    procedure ParseJoinUrl(const AJoinUrl: string;
                           out ABaseUrl, ASessionId: string);
  public
    constructor Create;
    destructor  Destroy; override;
    procedure JoinSession(const AJoinUrl, APlayerName: string);
    procedure LeaveSession;
    procedure PushScore(AScore: Integer);
    function  IsConnected: Boolean;
    function  GetPlayerName: string;
    function  GetSessionId: string;
  end;

  // ── TServerAwareScoreManager ──────────────────────────────────────────────
  //
  // Decorator that wraps any IScoreManager and transparently pushes the new
  // score to the server after every mutation.  Zero changes needed to the
  // existing event handlers in MainFrm.pas.
  // ──────────────────────────────────────────────────────────────────────────

  TServerAwareScoreManager = class(TInterfacedObject, IScoreManager)
  private
    FInner:  IScoreManager;
    FClient: IServerClient;
    procedure SyncScore;
  public
    constructor Create(AInner: IScoreManager; AClient: IServerClient);
    procedure Increase(AAmount: Integer);
    procedure Decrease(AAmount: Integer);
    procedure SetScore(AValue: Integer);
    procedure Reset;
    function  GetScore: Integer;
  end;

implementation

// ── TServerClient ────────────────────────────────────────────────────────────

constructor TServerClient.Create;
begin
  inherited Create;
  FHeartbeat          := TTimer.Create(nil);
  FHeartbeat.Interval := HeartbeatMs;
  FHeartbeat.Enabled  := False;
  FHeartbeat.OnTimer  := HeartbeatTick;
end;

destructor TServerClient.Destroy;
begin
  FHeartbeat.Enabled := False;
  FHeartbeat.Free;
  inherited;
end;

procedure TServerClient.ParseJoinUrl(const AJoinUrl: string;
                                     out ABaseUrl, ASessionId: string);
const
  JoinSeg = '/join/';
var
  P: Integer;
begin
  P := AJoinUrl.IndexOf(JoinSeg);
  if P < 0 then
    raise EArgumentException.CreateFmt(
      'Invalid join URL — expected /join/<sessionId>: %s', [AJoinUrl]);
  ABaseUrl   := AJoinUrl.Substring(0, P);
  ASessionId := AJoinUrl.Substring(P + Length(JoinSeg));
end;

function TServerClient.BuildPlayerUrl: string;
begin
  Result := FBaseUrl + '/api/sessions/' + FSessionId + '/players/' + FPlayerId;
end;

procedure TServerClient.RecordSuccess;
begin
  if FPlayerId = '' then Exit;   // guard against stale queued callbacks
  FFailCount := 0;
  FConnected := True;
end;

procedure TServerClient.RecordFailure;
begin
  if FPlayerId = '' then Exit;   // guard against stale queued callbacks
  Inc(FFailCount);
  if FFailCount >= MaxFailures then
    FConnected := False;
end;

// JoinSession — blocking; call from a background thread.
// Raises an exception on failure (URL parse error, network error, or non-201 response).
// On success, FConnected is True and the heartbeat timer is scheduled on the main thread.
procedure TServerClient.JoinSession(const AJoinUrl, APlayerName: string);
const
  ContentTypeHeader: TNameValuePair = (Name: 'Content-Type'; Value: 'application/json');
var
  BaseUrl, SessId: string;
  Http: THTTPClient;
  BodyStream: TStringStream;
  Resp: IHTTPResponse;
  RespBody: string;
  Json: TJSONObject;
  PlayerId: string;
begin
  ParseJoinUrl(AJoinUrl.Trim, BaseUrl, SessId);
  SessId := SessId.Trim;

  Http := THTTPClient.Create;
  try
    BodyStream := TStringStream.Create(
      '{"playerName":"' + APlayerName.Replace('"', '\"') + '"}',
      TEncoding.UTF8);
    try
      Resp     := Http.Post(
        BaseUrl + '/api/sessions/' + SessId + '/players',
        BodyStream, nil, [ContentTypeHeader]);
      RespBody := Resp.ContentAsString(TEncoding.UTF8);

      if Resp.StatusCode = 201 then
      begin
        Json := TJSONObject.ParseJSONValue(RespBody) as TJSONObject;
        try
          PlayerId := Json.GetValue<string>('playerId');
        finally
          Json.Free;
        end;

        FBaseUrl    := BaseUrl;
        FSessionId  := SessId;
        FPlayerId   := PlayerId;
        FPlayerName := APlayerName;
        RecordSuccess;

        // Enable heartbeat timer on the main thread.
        // Caller must be a real TThread (not TTask pool) for Synchronize to work.
        TThread.Synchronize(TThread.CurrentThread, procedure
        begin
          FHeartbeat.Enabled := True;
        end);
      end
      else
        raise Exception.CreateFmt(
          'Server antwoordde %d: %s', [Resp.StatusCode, RespBody]);
    finally
      BodyStream.Free;
    end;
  finally
    Http.Free;
  end;
end;

procedure TServerClient.LeaveSession;
begin
  FHeartbeat.Enabled := False;
  FBaseUrl    := '';
  FSessionId  := '';
  FPlayerId   := '';
  FPlayerName := '';
  FConnected  := False;
  FFailCount  := 0;
end;

// PushScore — fire-and-forget; safe to call from the main thread.
procedure TServerClient.PushScore(AScore: Integer);
var
  Url: string;
begin
  if (not FConnected) or (FPlayerId = '') then Exit;
  Url := BuildPlayerUrl + '/score';
  TTask.Run(procedure
  var
    Http: THTTPClient;
    BodyStream: TStringStream;
    Resp: IHTTPResponse;
  const
    ContentTypeHeader: TNameValuePair = (Name: 'Content-Type'; Value: 'application/json');
  begin
    Http := THTTPClient.Create;
    try
      BodyStream := TStringStream.Create(
        '{"score":' + AScore.ToString + '}', TEncoding.UTF8);
      try
        try
          Resp := Http.Put(Url, BodyStream, nil, [ContentTypeHeader]);
          if Resp.StatusCode = 200 then
            TThread.Queue(nil, procedure begin RecordSuccess; end)
          else
            TThread.Queue(nil, procedure begin RecordFailure; end);
        except
          TThread.Queue(nil, procedure begin RecordFailure; end);
        end;
      finally
        BodyStream.Free;
      end;
    finally
      Http.Free;
    end;
  end);
end;

// HeartbeatTick — fires on the main thread every 15 s while connected.
procedure TServerClient.HeartbeatTick(Sender: TObject);
var
  Url: string;
begin
  if FPlayerId = '' then Exit;
  Url := BuildPlayerUrl + '/heartbeat';
  TTask.Run(procedure
  var
    Http: THTTPClient;
    Resp: IHTTPResponse;
  begin
    Http := THTTPClient.Create;
    try
      try
        Resp := Http.Post(Url, TStream(nil));
        if Resp.StatusCode = 200 then
          TThread.Queue(nil, procedure begin RecordSuccess; end)
        else
          TThread.Queue(nil, procedure begin RecordFailure; end);
      except
        TThread.Queue(nil, procedure begin RecordFailure; end);
      end;
    finally
      Http.Free;
    end;
  end);
end;

function TServerClient.IsConnected: Boolean;
begin
  Result := FConnected;
end;

function TServerClient.GetPlayerName: string;
begin
  Result := FPlayerName;
end;

function TServerClient.GetSessionId: string;
begin
  Result := FSessionId;
end;

// ── TServerAwareScoreManager ─────────────────────────────────────────────────

constructor TServerAwareScoreManager.Create(AInner: IScoreManager;
                                            AClient: IServerClient);
begin
  inherited Create;
  FInner  := AInner;
  FClient := AClient;
end;

procedure TServerAwareScoreManager.SyncScore;
begin
  if FClient.IsConnected then
    FClient.PushScore(FInner.Score);
end;

procedure TServerAwareScoreManager.Increase(AAmount: Integer);
begin
  FInner.Increase(AAmount);
  SyncScore;
end;

procedure TServerAwareScoreManager.Decrease(AAmount: Integer);
begin
  FInner.Decrease(AAmount);
  SyncScore;
end;

procedure TServerAwareScoreManager.SetScore(AValue: Integer);
begin
  FInner.SetScore(AValue);
  SyncScore;
end;

procedure TServerAwareScoreManager.Reset;
begin
  FInner.Reset;
  SyncScore;
end;

function TServerAwareScoreManager.GetScore: Integer;
begin
  Result := FInner.GetScore;
end;

end.
