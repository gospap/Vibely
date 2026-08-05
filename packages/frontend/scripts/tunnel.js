// Start Expo behind two Cloudflare tunnels, so the phone never touches the LAN.
//
//   npm run tunnel
//
// Why this exists: this machine runs both Windows Firewall and Avast's own
// firewall, plus Tailscale and an OpenVPN adapter. Avast keeps rules per
// executable, so every Node update silently re-blocks the dev server and the
// phone starts timing out again. Going over a tunnel sidesteps all of it —
// firewalls, the DHCP address changing, and the VPN — and it works off WiFi
// too, so the phone can be on mobile data.
//
// ngrok (what `expo start --tunnel` uses) does not work here: Avast breaks its
// pinned control connection. cloudflared speaks QUIC to Cloudflare's edge and
// goes through cleanly.

const { spawn } = require("node:child_process");

const METRO_PORT = 8081;
const API_PORT = 3000;

const QUICK_TUNNEL = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;

const children = [];

// cloudflared prints the URL to stderr inside a box, a second or two after
// start. Resolve on the first match and leave the process running.
function openTunnel(port, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "cloudflared",
      ["tunnel", "--url", `http://localhost:${port}`],
      { shell: true },
    );

    children.push(child);

    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`${label}: cloudflared gave no URL within 45s`));
      }
    }, 45000);

    const scan = (chunk) => {
      const match = String(chunk).match(QUICK_TUNNEL);
      if (match && !settled) {
        settled = true;
        clearTimeout(timer);
        console.log(`  ${label.padEnd(6)} ${match[0]}`);
        resolve(match[0]);
      }
    };

    child.stdout.on("data", scan);
    child.stderr.on("data", scan);

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(
        new Error(
          `${label}: could not run cloudflared (${err.message}). Install it with: winget install Cloudflare.cloudflared`,
        ),
      );
    });

    child.on("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`${label}: cloudflared exited with ${code}`));
    });
  });
}

const shutdown = () => {
  for (const child of children) {
    try {
      child.kill();
    } catch {}
  }
};

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});
process.on("exit", shutdown);

(async () => {
  console.log("\nOpening tunnels...\n");

  const [metroUrl, apiUrl] = await Promise.all([
    openTunnel(METRO_PORT, "metro"),
    openTunnel(API_PORT, "api"),
  ]);

  const env = {
    ...process.env,
    // Overrides every host option Expo has, including --lan and --tunnel, and
    // is what makes the manifest advertise the tunnel instead of 192.168.x.x.
    EXPO_PACKAGER_PROXY_URL: metroUrl,
    // Baked into the bundle at build time and read by constants/api.js, so the
    // app calls the API over its own tunnel rather than the local address.
    EXPO_PUBLIC_API_URL: apiUrl,
  };

  console.log(
    `\nThe API tunnel only works while the backend is running on :${API_PORT}.\n`,
  );

  const expo = spawn("npx", ["expo", "start", ...process.argv.slice(2)], {
    stdio: "inherit",
    env,
    shell: true,
  });

  children.push(expo);

  expo.on("exit", (code, signal) => {
    shutdown();
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
})().catch((err) => {
  console.error(`\n${err.message}\n`);
  shutdown();
  process.exit(1);
});
