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
    /// Returns the first non-loopback IPv4 address, falling back to localhost.
    /// </summary>
    public string GetLanIpAddress()
    {
        var host = Dns.GetHostEntry(Dns.GetHostName());
        var address = host.AddressList
            .FirstOrDefault(ip => ip.AddressFamily == AddressFamily.InterNetwork
                               && !IPAddress.IsLoopback(ip));
        return address?.ToString() ?? "localhost";
    }

    /// <summary>
    /// Builds the full join URL for a session, e.g. http://192.168.1.5:5000/join/XK7P3Q
    /// </summary>
    public string BuildJoinUrl(string sessionId)
        => $"http://{GetLanIpAddress()}:{_port}/join/{sessionId}";
}
