using Microsoft.AspNetCore.Mvc;
using QRCoder;
using SlimsteMensTimerServer.Services;

namespace SlimsteMensTimerServer.Controllers;

[ApiController]
public class QrController : ControllerBase
{
    private const string AppStoreUrl =
        "https://play.google.com/apps/internaltest/4701444685052336832";

    private readonly SessionStore _store;
    private readonly IpAddressHelper _ipHelper;

    public QrController(SessionStore store, IpAddressHelper ipHelper)
    {
        _store = store;
        _ipHelper = ipHelper;
    }

    // GET /api/sessions/{sessionId}/qr  — join QR for a specific session
    [HttpGet("api/sessions/{sessionId}/qr")]
    public IActionResult GetSessionQrCode(string sessionId)
    {
        if (_store.GetSession(sessionId) is null) return NotFound();
        var joinUrl = _ipHelper.BuildJoinUrl(sessionId);
        return File(GeneratePng(joinUrl), "image/png");
    }

    // GET /api/appqr  — static QR encoding the Google Play download link
    [HttpGet("api/appqr")]
    public IActionResult GetAppQrCode()
        => File(GeneratePng(AppStoreUrl), "image/png");

    private static byte[] GeneratePng(string content)
    {
        using var qrGenerator = new QRCodeGenerator();
        var qrData = qrGenerator.CreateQrCode(content, QRCodeGenerator.ECCLevel.M);
        using var qrCode = new PngByteQRCode(qrData);
        return qrCode.GetGraphic(pixelsPerModule: 10);
    }
}
