unit TestScoreManager;

interface

uses
  System.SysUtils,
  DUnitX.TestFramework,
  ScoreManager;

type
  [TestFixture]
  TScoreManagerTests = class
  private
    FSM: IScoreManager;
  public
    [Setup]
    procedure Setup;
    [TearDown]
    procedure TearDown;

    // Create
    [Test] procedure Create_InitialScoreIs60;

    // Reset
    [Test] procedure Reset_FromDefault_ScoreIs60;
    [Test] procedure Reset_AfterIncrease_ScoreIs60;
    [Test] procedure Reset_AfterDecrease_ScoreIs60;
    [Test] procedure Reset_AfterSetScore_ScoreIs60;

    // Increase
    [Test] procedure Increase_AddsAmount;
    [Test] procedure Increase_ByZero_NoChange;
    [Test] procedure Increase_BeyondScoreMax_Allowed;
    [Test] procedure Increase_FromZero;

    // Decrease
    [Test] procedure Decrease_SubtractsAmount;
    [Test] procedure Decrease_ByZero_NoChange;
    [Test] procedure Decrease_ClampsToZero;
    [Test] procedure Decrease_ExactlyToZero;
    [Test] procedure Decrease_AlreadyZero_StaysZero;

    // SetScore
    [Test] procedure SetScore_SetsValue;
    [Test] procedure SetScore_LowerBound_Valid;
    [Test] procedure SetScore_UpperBound_Valid;
    [Test] procedure SetScore_BelowMin_RaisesException;
    [Test] procedure SetScore_AboveMax_RaisesException;
    [Test] procedure SetScore_FarBelowMin_RaisesException;
    [Test] procedure SetScore_FarAboveMax_RaisesException;
  end;

implementation

procedure TScoreManagerTests.Setup;
begin
  FSM := TScoreManager.Create;
end;

procedure TScoreManagerTests.TearDown;
begin
  FSM := nil;
end;

// --- Create ---

procedure TScoreManagerTests.Create_InitialScoreIs60;
begin
  Assert.AreEqual(ScoreDefault, FSM.Score);
end;

// --- Reset ---

procedure TScoreManagerTests.Reset_FromDefault_ScoreIs60;
begin
  FSM.Reset;
  Assert.AreEqual(ScoreDefault, FSM.Score);
end;

procedure TScoreManagerTests.Reset_AfterIncrease_ScoreIs60;
begin
  FSM.Increase(40);
  FSM.Reset;
  Assert.AreEqual(ScoreDefault, FSM.Score);
end;

procedure TScoreManagerTests.Reset_AfterDecrease_ScoreIs60;
begin
  FSM.Decrease(20);
  FSM.Reset;
  Assert.AreEqual(ScoreDefault, FSM.Score);
end;

procedure TScoreManagerTests.Reset_AfterSetScore_ScoreIs60;
begin
  FSM.SetScore(200);
  FSM.Reset;
  Assert.AreEqual(ScoreDefault, FSM.Score);
end;

// --- Increase ---

procedure TScoreManagerTests.Increase_AddsAmount;
begin
  FSM.Increase(20);
  Assert.AreEqual(80, FSM.Score);
end;

procedure TScoreManagerTests.Increase_ByZero_NoChange;
begin
  FSM.Increase(0);
  Assert.AreEqual(ScoreDefault, FSM.Score);
end;

procedure TScoreManagerTests.Increase_BeyondScoreMax_Allowed;
begin
  FSM.SetScore(ScoreMax);
  FSM.Increase(20);
  Assert.AreEqual(ScoreMax + 20, FSM.Score);
end;

procedure TScoreManagerTests.Increase_FromZero;
begin
  FSM.SetScore(0);
  FSM.Increase(1);
  Assert.AreEqual(1, FSM.Score);
end;

// --- Decrease ---

procedure TScoreManagerTests.Decrease_SubtractsAmount;
begin
  FSM.Decrease(20);
  Assert.AreEqual(40, FSM.Score);
end;

procedure TScoreManagerTests.Decrease_ByZero_NoChange;
begin
  FSM.Decrease(0);
  Assert.AreEqual(ScoreDefault, FSM.Score);
end;

procedure TScoreManagerTests.Decrease_ClampsToZero;
begin
  FSM.Decrease(100);
  Assert.AreEqual(0, FSM.Score);
end;

procedure TScoreManagerTests.Decrease_ExactlyToZero;
begin
  FSM.Decrease(ScoreDefault);
  Assert.AreEqual(0, FSM.Score);
end;

procedure TScoreManagerTests.Decrease_AlreadyZero_StaysZero;
begin
  FSM.SetScore(0);
  FSM.Decrease(1);
  Assert.AreEqual(0, FSM.Score);
end;

// --- SetScore ---

procedure TScoreManagerTests.SetScore_SetsValue;
begin
  FSM.SetScore(500);
  Assert.AreEqual(500, FSM.Score);
end;

procedure TScoreManagerTests.SetScore_LowerBound_Valid;
begin
  FSM.SetScore(ScoreMin);
  Assert.AreEqual(ScoreMin, FSM.Score);
end;

procedure TScoreManagerTests.SetScore_UpperBound_Valid;
begin
  FSM.SetScore(ScoreMax);
  Assert.AreEqual(ScoreMax, FSM.Score);
end;

procedure TScoreManagerTests.SetScore_BelowMin_RaisesException;
begin
  Assert.WillRaise(
    procedure begin FSM.SetScore(-1) end,
    EArgumentOutOfRangeException);
end;

procedure TScoreManagerTests.SetScore_AboveMax_RaisesException;
begin
  Assert.WillRaise(
    procedure begin FSM.SetScore(ScoreMax + 1) end,
    EArgumentOutOfRangeException);
end;

procedure TScoreManagerTests.SetScore_FarBelowMin_RaisesException;
begin
  Assert.WillRaise(
    procedure begin FSM.SetScore(-9999) end,
    EArgumentOutOfRangeException);
end;

procedure TScoreManagerTests.SetScore_FarAboveMax_RaisesException;
begin
  Assert.WillRaise(
    procedure begin FSM.SetScore(99999) end,
    EArgumentOutOfRangeException);
end;

initialization
  TDUnitX.RegisterTestFixture(TScoreManagerTests);

end.
