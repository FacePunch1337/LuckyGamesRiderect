import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import pg from "pg";

const app = express();
const port = process.env.PORT || 3000;
const databaseUrl = process.env.DATABASE_URL;
const adminPassword = process.env.ADMIN_PASSWORD || "";

if (!databaseUrl) {
  console.warn("DATABASE_URL is not set. Analytics routes will return a database configuration error.");
}

app.set("trust proxy", true);
app.use(express.json({ limit: "64kb" }));
app.use(express.static("public", { extensions: ["html"] }));

let pool;
let schemaReady = false;
let schemaPromise;

async function getPool() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!pool) {
    pool = new pg.Pool({
      connectionString: databaseUrl,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
    });
  }

  if (!schemaReady) {
    schemaPromise ||= ensureSchema();
    await schemaPromise;
    schemaReady = true;
  }

  return pool;
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS page_views (
      id BIGSERIAL PRIMARY KEY,
      game TEXT NOT NULL,
      session_id TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      country TEXT,
      region TEXT,
      city TEXT,
      geo_source TEXT,
      user_agent TEXT,
      referrer TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS redirects (
      id BIGSERIAL PRIMARY KEY,
      game TEXT NOT NULL,
      session_id TEXT NOT NULL,
      target_url TEXT,
      ip_hash TEXT NOT NULL,
      country TEXT,
      region TEXT,
      city TEXT,
      geo_source TEXT,
      user_agent TEXT,
      referrer TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_page_views_game_created_at ON page_views (game, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_redirects_created_at ON redirects (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_redirects_game_created_at ON redirects (game, created_at DESC);
  `);
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const firstForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  return (firstForwarded || req.ip || req.socket.remoteAddress || "").trim().replace(/^::ffff:/, "");
}

function isPublicIp(ip) {
  return Boolean(ip) && !/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|::1|localhost)/.test(ip);
}

function hashIp(ip) {
  return crypto.createHash("sha256").update(`${ip}:${process.env.IP_HASH_SALT || "lucky-games"}`).digest("hex");
}

async function getGeo(req, ip) {
  const headerGeo = {
    country: req.headers["cf-ipcountry"] || req.headers["x-vercel-ip-country"] || null,
    region: req.headers["x-vercel-ip-country-region"] || null,
    city: req.headers["x-vercel-ip-city"] || null,
    source: "headers",
  };

  if (headerGeo.country || headerGeo.region || headerGeo.city) {
    return headerGeo;
  }

  if (process.env.ENABLE_IP_GEOLOOKUP !== "true" || !isPublicIp(ip)) {
    return { country: null, region: null, city: null, source: "unresolved" };
  }

  try {
    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city`
    );
    const data = await response.json();
    if (data.status !== "success") {
      return { country: null, region: null, city: null, source: "ip-api" };
    }

    return {
      country: data.country || null,
      region: data.regionName || null,
      city: data.city || null,
      source: "ip-api",
    };
  } catch {
    return { country: null, region: null, city: null, source: "ip-api-error" };
  }
}

function normalizeGame(game) {
  return ["wheel", "slots", "balloon"].includes(game) ? game : "unknown";
}

function cleanGeoValue(value) {
  return typeof value === "string" ? value.trim().slice(0, 120) || null : null;
}

function getClientGeo(input) {
  if (!input || typeof input !== "object") {
    return null;
  }

  const geo = {
    country: cleanGeoValue(input.country),
    region: cleanGeoValue(input.region),
    city: cleanGeoValue(input.city),
    source: "client-ip-lookup",
  };

  return geo.country || geo.region || geo.city ? geo : null;
}

function mergeGeo(serverGeo, clientGeo) {
  if (serverGeo.country || serverGeo.region || serverGeo.city) {
    return serverGeo;
  }

  return clientGeo || serverGeo;
}

async function insertAnalytics(tableName, req, extra) {
  const db = await getPool();
  const ip = getClientIp(req);
  const serverGeo = await getGeo(req, ip);
  const geo = mergeGeo(serverGeo, getClientGeo(extra.clientGeo));
  const commonValues = [
    normalizeGame(extra.game),
    String(extra.sessionId || "anonymous").slice(0, 128),
    hashIp(ip),
    geo.country,
    geo.region,
    geo.city,
    geo.source,
    req.headers["user-agent"] || null,
    req.headers.referer || req.headers.referrer || null,
  ];

  if (tableName === "redirects") {
    await db.query(
      `INSERT INTO redirects
        (game, session_id, ip_hash, country, region, city, geo_source, user_agent, referrer, target_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [...commonValues, String(extra.targetUrl || "").slice(0, 2048)]
    );
    return;
  }

  await db.query(
    `INSERT INTO page_views
      (game, session_id, ip_hash, country, region, city, geo_source, user_agent, referrer)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    commonValues
  );
}

app.post("/api/analytics/page-view", async (req, res) => {
  try {
    await insertAnalytics("page_views", req, {
      game: req.body.game,
      sessionId: req.body.sessionId,
      clientGeo: req.body.clientGeo,
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/analytics/redirect", async (req, res) => {
  try {
    await insertAnalytics("redirects", req, {
      game: req.body.game,
      sessionId: req.body.sessionId,
      clientGeo: req.body.clientGeo,
      targetUrl: String(req.body.targetUrl || "").slice(0, 2048),
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

async function getAnalyticsSummary() {
  const db = await getPool();
  const [totalViews, totalRedirects, viewsByGame, redirectsByGame, locations, recentRedirects] =
    await Promise.all([
      db.query("SELECT COUNT(*)::int AS count FROM page_views"),
      db.query("SELECT COUNT(*)::int AS count FROM redirects"),
      db.query("SELECT game AS id, COUNT(*)::int AS count FROM page_views GROUP BY game ORDER BY count DESC"),
      db.query("SELECT game AS id, COUNT(*)::int AS count FROM redirects GROUP BY game ORDER BY count DESC"),
      db.query(`
        SELECT COALESCE(country, 'Unknown') AS country,
               COALESCE(region, 'Unknown') AS region,
               COUNT(*)::int AS count
        FROM page_views
        GROUP BY COALESCE(country, 'Unknown'), COALESCE(region, 'Unknown')
        ORDER BY count DESC
        LIMIT 25
      `),
      db.query(`
        SELECT game, target_url, country, region, city, geo_source, created_at
        FROM redirects
        ORDER BY created_at DESC
        LIMIT 20
      `),
    ]);

  return {
    totalViews: totalViews.rows[0].count,
    totalRedirects: totalRedirects.rows[0].count,
    viewsByGame: viewsByGame.rows,
    redirectsByGame: redirectsByGame.rows,
    locations: locations.rows,
    recentRedirects: recentRedirects.rows,
  };
}

function requireAdmin(req, res, next) {
  if (!adminPassword) {
    return next();
  }

  const provided = req.query.key || req.headers["x-admin-key"];
  if (provided === adminPassword) {
    return next();
  }

  res.status(401).send("Unauthorized. Add ?key=YOUR_ADMIN_PASSWORD to the URL.");
}

function rows(items, labelFn) {
  return items.map((item) => `<tr>${labelFn(item)}</tr>`).join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

app.get("/admin", requireAdmin, async (_req, res) => {
  try {
    const summary = await getAnalyticsSummary();
    res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Lucky Games Admin</title>
  <style>
    body { margin: 0; font-family: Inter, Arial, sans-serif; background: #0c1024; color: #f8fafc; }
    main { width: min(1120px, calc(100% - 32px)); margin: 0 auto; padding: 32px 0 48px; }
    h1 { color: #ffbd20; margin: 0 0 24px; }
    .cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 24px; }
    .card, table { background: #151d35; border: 1px solid rgba(255, 189, 32, .22); border-radius: 8px; }
    .card { padding: 22px; }
    .card b { display: block; font-size: 38px; color: #ffbd20; }
    section { margin-top: 24px; }
    h2 { color: #ffbd20; font-size: 20px; }
    table { width: 100%; border-collapse: collapse; overflow: hidden; }
    th, td { padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,.08); text-align: left; }
    th { color: #aeb8d4; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
    @media (max-width: 720px) { .cards { grid-template-columns: 1fr; } table { font-size: 13px; } }
  </style>
</head>
<body>
  <main>
    <h1>Lucky Games Analytics</h1>
    <div class="cards">
      <div class="card"><span>Total page visits</span><b>${summary.totalViews}</b></div>
      <div class="card"><span>Total redirects</span><b>${summary.totalRedirects}</b></div>
    </div>
    <section>
      <h2>Visits by game</h2>
      <table><thead><tr><th>Game</th><th>Visits</th></tr></thead><tbody>${rows(summary.viewsByGame, (x) => `<td>${escapeHtml(x.id)}</td><td>${x.count}</td>`)}</tbody></table>
    </section>
    <section>
      <h2>Redirects by game</h2>
      <table><thead><tr><th>Game</th><th>Redirects</th></tr></thead><tbody>${rows(summary.redirectsByGame, (x) => `<td>${escapeHtml(x.id)}</td><td>${x.count}</td>`)}</tbody></table>
    </section>
    <section>
      <h2>Locations</h2>
      <table><thead><tr><th>Country</th><th>Region</th><th>Visits</th></tr></thead><tbody>${rows(summary.locations, (x) => `<td>${escapeHtml(x.country)}</td><td>${escapeHtml(x.region)}</td><td>${x.count}</td>`)}</tbody></table>
    </section>
    <section>
      <h2>Recent redirects</h2>
      <table><thead><tr><th>Date</th><th>Game</th><th>Country</th><th>Region</th><th>Target</th></tr></thead><tbody>${rows(summary.recentRedirects, (x) => `<td>${escapeHtml(new Date(x.created_at).toLocaleString())}</td><td>${escapeHtml(x.game)}</td><td>${escapeHtml(x.country || "Unknown")}</td><td>${escapeHtml(x.region || "Unknown")}</td><td>${escapeHtml(x.target_url || "")}</td>`)}</tbody></table>
    </section>
  </main>
</body>
</html>`);
  } catch (error) {
    res.status(500).send(`Admin error: ${error.message}`);
  }
});

app.get("/health", async (_req, res) => {
  try {
    await getPool();
    res.json({ ok: true, db: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Lucky mini games server running on http://localhost:${port}`);
});
