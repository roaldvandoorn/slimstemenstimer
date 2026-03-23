using SlimsteMensTimerServer.Hubs;
using SlimsteMensTimerServer.Services;

var builder = WebApplication.CreateBuilder(args);

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

// /join/{sessionId} — deep-link target encoded in the QR code.
// Redirects to the lobby page with the session ID as a query parameter.
app.MapGet("/join/{sessionId}", (string sessionId) =>
    Results.Redirect($"/lobby.html?session={sessionId}"));

// Log the server's LAN address on startup so it's easy to find
app.Lifetime.ApplicationStarted.Register(() =>
{
    var ipHelper = app.Services.GetRequiredService<IpAddressHelper>();
    app.Logger.LogInformation("Server ready. LAN address: {JoinBase}", ipHelper.BuildJoinUrl(string.Empty).TrimEnd('/'));
    app.Logger.LogInformation("Swagger UI: http://localhost:{Port}/swagger",
        new Uri(builder.Configuration["Urls"] ?? "http://0.0.0.0:5000").Port);
});

app.Run();
