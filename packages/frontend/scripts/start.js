// Expo works out the dev machine's LAN address with lan-network's *sync* API,
// which spawns a child node process and gives it 500ms to answer. Node cold
// start on this machine is ~600ms, so the probe gets killed every time and Expo
// quietly falls back to 127.0.0.1. That loopback address ends up in the manifest
// as hostUri, src/constants/api.js builds API_URL from it, and the phone then
// dials itself instead of the laptop — "could not connect to server".
//
// The async resolver has no such budget (~10ms), so do the lookup here and hand
// the answer to Expo through the one env var it reads before doing its own
// detection. Still no hardcoded IP: it follows WiFi, hotspot or Tailscale the
// same way the old behaviour was meant to.

const { spawn } = require("node:child_process");
const dgram = require("node:dgram");
const os = require("node:os");

// Opening a UDP socket towards a public address makes the OS pick the interface
// it would really route through, without sending a single packet.
const probeLanAddress = () =>
  new Promise((resolve) => {
    const socket = dgram.createSocket("udp4");
    const done = (value) => {
      try {
        socket.close();
      } catch {}
      resolve(value);
    };

    socket.once("error", () => done(null));
    try {
      socket.connect(53, "8.8.8.8", () => {
        const address = socket.address()?.address;
        done(address && address !== "0.0.0.0" ? address : null);
      });
    } catch {
      done(null);
    }
  });

// Offline, or the probe failed: take any non-internal IPv4 and hope it is the
// one the phone can see.
const firstLocalAddress = () =>
  Object.values(os.networkInterfaces())
    .flat()
    .find((nic) => nic && nic.family === "IPv4" && !nic.internal)?.address ??
  null;

const main = async () => {
  const env = { ...process.env };

  // An explicit value wins, so overriding by hand still works.
  if (!env.REACT_NATIVE_PACKAGER_HOSTNAME) {
    const address = (await probeLanAddress()) ?? firstLocalAddress();

    if (address && address !== "127.0.0.1") {
      env.REACT_NATIVE_PACKAGER_HOSTNAME = address;
      console.log(`Serving to devices on ${address}`);
    } else {
      console.warn(
        "No LAN address found — letting Expo choose. A phone on WiFi may not reach the API.",
      );
    }
  }

  const child = spawn(
    "npx",
    ["expo", "start", ...process.argv.slice(2)],
    { stdio: "inherit", env, shell: true },
  );

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
};

main();
