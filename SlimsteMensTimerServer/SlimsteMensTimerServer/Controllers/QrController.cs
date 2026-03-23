using Microsoft.AspNetCore.Mvc;
using QRCoder;
using SlimsteMensTimerServer.Services;

namespace SlimsteMensTimerServer.Controllers;

[ApiController]
[Route("api/sessions")]
public class QrController : ControllerBase
{
    private readonly SessionStore _store;
    private readonly IpAddressHelper _ipHelper;

    public QrController(SessionStore store, IpAddressHelper ipHelper)
    {
        _store = store;
        _ipHelper = ipHelper;
    }

    // GET /api/sessions/{sessionId}/qr
    [HttpGet("{sessionId}/qr")]
    public IActionResult GetQrCode(string sessionId)
    {
        if (_store.GetSession(sessionId) is null) return NotFound();

        var joinUrl = _ipHelper.BuildJoinUrl(sessionId);

        using var qrGenerator = new QRCodeGenerator();
        var qrData = qrGenerator.CreateQrCode(joinUrl, QRCodeGenerator.ECCLevel.M);
        using var qrCode = new PngByteQRCode(qrData);
        var pngBytes = qrCode.GetGraphic(pixelsPerModule: 10);

        return File(pngBytes, "image/png");
    }
}
