using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using SlimsteMensTimerServer.Hubs;
using SlimsteMensTimerServer.Models;
using SlimsteMensTimerServer.Services;

var builder = WebApplication.CreateBuilder(args);

// Enables Windows Service lifecycle (signals SCM, sets content root to exe directory)
builder.Host.UseWindowsService();

// ── Services ────────────────────────────────────────────────────────────────

builder.Services.AddControllers();

// SignalR for real-time score broadcasting to browser clients
builder.Services.AddSignalR();

// Swagger / OpenAPI — useful during development for manual API testing
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Application services
builder.Services.AddSingleton<SessionStore>();
builder.Services.AddSingleton<IpAddressHelper>();
builder.Services.AddHostedService<HeartbeatMonitor>();
builder.Services.AddSingleton(new StartupInfo(DateTimeOffset.UtcNow));

// Health checks — exposed at /health
builder.Services.AddHealthChecks();

// CORS — allow all origins with credentials (required for SignalR WebSocket negotiation)
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// ── App ─────────────────────────────────────────────────────────────────────

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Static files (lobby.html, scoreboard.html, JS, CSS) served from wwwroot/
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCors();

app.MapControllers();
app.MapHub<GameHub>("/gamehub");
app.MapHealthChecks("/health");

// /join/{sessionId} — deep-link target encoded in the QR code.
// Browser users land on player.html; the Android app parses this URL directly and never follows the redirect.
app.MapGet("/join/{sessionId}", (string sessionId, SessionStore store) =>
{
    var session = store.GetSession(sessionId);
    if (session is null || session.State == SessionState.Ended)
        return Results.Redirect("/lobby.html");
    return Results.Redirect($"/player.html?session={sessionId}");
});

// Log the server's LAN address on startup so it's easy to find
app.Lifetime.ApplicationStarted.Register(() =>
{
    var ipHelper = app.Services.GetRequiredService<IpAddressHelper>();
    app.Logger.LogInformation("Server ready. LAN address: {JoinBase}", ipHelper.BuildJoinUrl(string.Empty).TrimEnd('/'));
    app.Logger.LogInformation("Swagger UI: http://localhost:{Port}/swagger",
        new Uri(builder.Configuration["Urls"] ?? "http://0.0.0.0:5000").Port);
});

app.Run();
