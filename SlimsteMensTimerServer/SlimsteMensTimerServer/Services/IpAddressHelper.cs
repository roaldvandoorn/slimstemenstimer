using System.Net;
using System.Net.Sockets;

namespace SlimsteMensTimerServer.Services;

/// <summary>
/// Resolves the machine's LAN IP address and builds session join URLs.
/// </summary>
public class IpAddressHelper
{
    private readonly int _port;

    public IpAddressHelper(IConfiguration config)
    {
        var urls = config["Urls"] ?? "http://0.0.0.0:5000";
        _port = new Uri(urls).Port;
    }

    /// <summary>
    /// Returns the best LAN IPv4 address, preferring 192.168.x.x over other
    /// private ranges (10.x.x.x is also used by VPN tunnels, so it ranks lower).
    /// Falls back to any non-loopback address, then localhost.
    /// </summary>
    public string GetLanIpAddress()
    {
        var host = Dns.GetHostEntry(Dns.GetHostName());
        var candidates = host.AddressList
            .Where(ip => ip.AddressFamily == AddressFamily.InterNetwork
                      && !IPAddress.IsLoopback(ip))
            .ToList();

        // 192.168.x.x — typical home/office LAN
        var preferred = candidates.FirstOrDefault(ip => ip.ToString().StartsWith("192.168."));
        if (preferred != null) return preferred.ToString();

        // 172.16–31.x.x — less common LAN range
        var fallback172 = candidates.FirstOrDefault(ip =>
        {
            var bytes = ip.GetAddressBytes();
            return bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31;
        });
        if (fallback172 != null) return fallback172.ToString();

        // 10.x.x.x — last resort (may be VPN)
        var fallback10 = candidates.FirstOrDefault(ip => ip.ToString().StartsWith("10."));
        if (fallback10 != null) return fallback10.ToString();

        return candidates.FirstOrDefault()?.ToString() ?? "localhost";
    }

    /// <summary>
    /// Builds the full join URL for a session, e.g. http://192.168.1.5:5000/join/XK7P3Q
    /// </summary>
    public string BuildJoinUrl(string sessionId)
        => $"http://{GetLanIpAddress()}:{_port}/join/{sessionId}";
}
