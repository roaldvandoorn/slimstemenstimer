unit ScoreManager;

interface

uses
  System.SysUtils, System.Math;

type
  IScoreManager = interface
    ['{A3F2E1D4-B5C6-4789-8A0B-1C2D3E4F5A6B}']
    procedure Increase(AAmount: Integer);
    procedure Decrease(AAmount: Integer);
    procedure SetScore(AValue: Integer);
    procedure Reset;
    function GetScore: Integer;
    property Score: Integer read GetScore;
  end;

  TScoreManager = class(TInterfacedObject, IScoreManager)
  private
    FScore: Integer;
  public
    constructor Create;
    procedure Increase(AAmount: Integer);
    procedure Decrease(AAmount: Integer);
    procedure SetScore(AValue: Integer);
    procedure Reset;
    function GetScore: Integer;
  end;

const
  ScoreDefault = 60;
  ScoreMin     = 0;
  ScoreMax     = 1000;

implementation

constructor TScoreManager.Create;
begin
  inherited Create;
  FScore := ScoreDefault;
end;

procedure TScoreManager.Increase(AAmount: Integer);
begin
  FScore := FScore + AAmount;
end;

procedure TScoreManager.Decrease(AAmount: Integer);
begin
  FScore := Max(ScoreMin, FScore - AAmount);
end;

procedure TScoreManager.SetScore(AValue: Integer);
begin
  if (AValue < ScoreMin) or (AValue > ScoreMax) then
    raise EArgumentOutOfRangeException.CreateFmt(
      'Score must be between %d and %d, got %d', [ScoreMin, ScoreMax, AValue]);
  FScore := AValue;
end;

procedure TScoreManager.Reset;
begin
  FScore := ScoreDefault;
end;

function TScoreManager.GetScore: Integer;
begin
  Result := FScore;
end;

end.
