unit ScannerFrm;

// ZXing.Delphi QR scanner form.
//
// Prerequisites:
//   1. Add the ZXing.Delphi library root to Delphi's library search path:
//      Tools > Options > Language > Delphi > Library > Library Path
//      Add: <ZXing.Delphi root>\Lib\Depends\Generics
//           <ZXing.Delphi root>\Lib\Depends
//           <ZXing.Delphi root>\Lib\Classes\Common
//           <ZXing.Delphi root>\Lib\Classes\Android
//   2. CAMERA permission is declared in AndroidManifest.template.xml.
//   3. Add ScannerFrm.pas to the project via Project > Add to Project.
//
// Usage:
//   TScannerForm.ScanQRCode(Self, procedure(const AUrl: string)
//   begin
//     // AUrl is the scanned text; called only on a successful scan.
//     // If the user cancels, this callback is not invoked.
//   end);

interface

uses
  System.SysUtils, System.Types, System.Classes, System.Threading,
  FMX.Types, FMX.Controls, FMX.Forms, FMX.Graphics,
  FMX.Objects, FMX.StdCtrls, FMX.Layouts, FMX.Media,
  ZXing.ScanManager, ZXing.BarcodeFormat, ZXing.ReadResult,
  System.UITypes;

type

  TOnResultProc = reference to procedure(const AScannedUrl: string);

  TScannerForm = class(TForm)
  private
    FCameraComponent: TCameraComponent;
    FImgPreview:      TImage;
    FLblHint:         TLabel;
    FBtnCancel:       TRectangle;
    FScanManager:     TScanManager;
    FFrameCount:      Integer;
    FResultFound:     Boolean;
    FOnResult:        TOnResultProc;
    procedure BuildUI;
    procedure CameraSampleReady(Sender: TObject; const ATime: TMediaTime);
    procedure CancelClick(Sender: TObject);
    procedure DoFormShow(Sender: TObject);
    procedure DoFormClose(Sender: TObject; var Action: TCloseAction);
  public
    constructor Create(AOwner: TComponent); override;
    destructor  Destroy; override;
    // Launch the scanner and receive the result via AOnResult.
    // AOnResult is called only on a successful scan; not called on cancel.
    class procedure ScanQRCode(AOwner: TComponent; AOnResult: TOnResultProc);
  end;

implementation

{$R *.fmx}

// ── Construction / destruction ────────────────────────────────────────────────

constructor TScannerForm.Create(AOwner: TComponent);
begin
  inherited Create(AOwner);
  BuildUI;
  FScanManager := TScanManager.Create(TBarcodeFormat.QR_CODE, nil);
  OnShow  := DoFormShow;
  OnClose := DoFormClose;
end;

destructor TScannerForm.Destroy;
begin
  FScanManager.Free;
  inherited;
end;

// ── UI ────────────────────────────────────────────────────────────────────────

procedure TScannerForm.BuildUI;
var
  Background: TRectangle;
  BtnText:    TText;
begin
  FormFactor.Orientations := [TFormOrientation.Portrait];
  BorderStyle := TFmxFormBorderStyle.None;

  // Full-screen black background
  Background := TRectangle.Create(Self);
  Background.Parent := Self;
  Background.Align  := TAlignLayout.Client;
  Background.Fill.Color  := TAlphaColors.Black;
  Background.Stroke.Kind := TBrushKind.None;

  // Hint label — top
  FLblHint := TLabel.Create(Self);
  FLblHint.Parent := Background;
  FLblHint.Align  := TAlignLayout.Top;
  FLblHint.Height := 64;
  FLblHint.Margins.Rect := RectF(0, 0, 0, 0);
  FLblHint.StyledSettings := [];
  FLblHint.TextSettings.Font.Size  := 16;
  FLblHint.TextSettings.FontColor  := TAlphaColors.White;
  FLblHint.TextSettings.HorzAlign  := TTextAlign.Center;
  FLblHint.TextSettings.VertAlign  := TTextAlign.Center;
  FLblHint.Text := 'Richt de camera op de QR-code';

  // Cancel button — bottom
  FBtnCancel := TRectangle.Create(Self);
  FBtnCancel.Parent := Background;
  FBtnCancel.Align  := TAlignLayout.Bottom;
  FBtnCancel.Height := 72;
  FBtnCancel.Fill.Color  := $FFFFA726;   // orange — matches app palette
  FBtnCancel.Stroke.Kind := TBrushKind.None;
  FBtnCancel.OnClick := CancelClick;

  BtnText := TText.Create(Self);
  BtnText.Parent := FBtnCancel;
  BtnText.Align  := TAlignLayout.Client;
  BtnText.Text   := 'Annuleren';
  BtnText.TextSettings.Font.Size := 20;
  BtnText.TextSettings.FontColor := TAlphaColors.White;
  BtnText.TextSettings.HorzAlign := TTextAlign.Center;
  BtnText.OnClick := CancelClick;

  // Camera preview — fills the remaining centre area
  FImgPreview := TImage.Create(Self);
  FImgPreview.Parent   := Background;
  FImgPreview.Align    := TAlignLayout.Client;
  FImgPreview.WrapMode := TImageWrapMode.Fit;
  FImgPreview.Bitmap   := TBitmap.Create(1, 1);   // placeholder until first frame

  // Camera component (non-visual)
  FCameraComponent := TCameraComponent.Create(Self);
  FCameraComponent.Kind                := TCameraKind.BackCamera;
  FCameraComponent.Quality             := TVideoCaptureQuality.HighQuality;
  FCameraComponent.FocusMode           := TFocusMode.ContinuousAutoFocus;
  FCameraComponent.OnSampleBufferReady := CameraSampleReady;
end;

// ── Camera lifecycle ──────────────────────────────────────────────────────────

procedure TScannerForm.DoFormShow(Sender: TObject);
begin
  FResultFound := False;
  FFrameCount  := 0;
  FCameraComponent.Active := True;
end;

procedure TScannerForm.DoFormClose(Sender: TObject; var Action: TCloseAction);
begin
//  FCameraComponent.Active := False;
  Action := TCloseAction.caFree;
end;

// ── Frame capture + QR decoding ───────────────────────────────────────────────

procedure TScannerForm.CameraSampleReady(Sender: TObject; const ATime: TMediaTime);
var
  Bmp:         TBitmap;
  PreviewBmp:  TBitmap;
  ScanResult:  TReadResult;
  ScannedText: string;
begin
  if FResultFound then Exit;

  Bmp := TBitmap.Create(0, 0);
  try
    // Must be called on the camera thread (inside SampleBufferReady)
    FCameraComponent.SampleBufferToBitmap(Bmp, True);

    // Throttle decoding — scan every 15th frame (~1 Hz at typical 15 fps)
    Inc(FFrameCount);
    if FFrameCount mod 15 = 0 then
    begin
      ScanResult := FScanManager.Scan(Bmp);
      if ScanResult <> nil then
      begin
        ScannedText := ScanResult.Text;
        ScanResult.Free;
        FResultFound := True;
        TThread.Queue(nil, procedure
        begin
//          FCameraComponent.Active := False;
          if Assigned(FOnResult) then
            FOnResult(ScannedText);
          Close;
        end);
        Exit;
      end;
    end;

    // Update the preview image on the main thread
    PreviewBmp := TBitmap.Create(0, 0);
    PreviewBmp.Assign(Bmp);
    TThread.Queue(nil, procedure
    begin
      FImgPreview.Bitmap.Assign(PreviewBmp);
      PreviewBmp.Free;
    end);

  finally
    Bmp.Free;
  end;
end;

// ── Cancel ────────────────────────────────────────────────────────────────────

procedure TScannerForm.CancelClick(Sender: TObject);
begin
  Close;  // DoFormClose stops camera + frees form; FOnResult is NOT called
end;

// ── Public factory method ─────────────────────────────────────────────────────

class procedure TScannerForm.ScanQRCode(AOwner: TComponent; AOnResult: TOnResultProc);
var
  Form: TScannerForm;
begin
  Form := TScannerForm.Create(AOwner);
  Form.FOnResult := AOnResult;
  Form.Show;
end;

end.
