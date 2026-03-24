using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using SlimsteMensTimerServer.Models;
using SlimsteMensTimerServer.Services;

namespace SlimsteMensTimerServer.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StatusController : ControllerBase
{
    private readonly SessionStore _store;
    private readonly StartupInfo _startup;

    public StatusController(SessionStore store, StartupInfo startup)
    {
        _store = store;
        _startup = startup;
    }

    /// <summary>
    /// Returns a JSON snapshot of the server's current state.
    /// Used by status.html for the live dashboard and by lobby/scoreboard pages to display the version.
    /// </summary>
    [HttpGet]
    public IActionResult Get()
    {
        var version = Assembly.GetExecutingAssembly()
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion ?? "dev";

        var uptime = DateTimeOffset.UtcNow - _startup.StartedAt;

        var activeSessions = _store.GetAllSessions()
            .Where(s => s.State != SessionState.Ended)
            .ToList();

        return Ok(new
        {
            version,
            uptimeSeconds = (long)uptime.TotalSeconds,
            activeSessions = activeSessions.Count,
            totalPlayers = activeSessions.Sum(s => s.Players.Count)
        });
    }
}
