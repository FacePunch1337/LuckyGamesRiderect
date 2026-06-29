import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import { MongoClient } from "mongodb";

const app = express();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "lucky_games";
const adminPassword = process.env.ADMIN_PASSWORD || "";

if (!mongoUri) {
  console.warn("MONGODB_URI is not set. Analytics routes will return a database configuration error.");
}

app.set("trust proxy", true);
app.use(express.json({ limit: "64kb" }));
app.use(express.static("public", { extensions: ["html"] }));

let mongoClient;
let mongoDb;

async function getDb() {
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!mongoClient) {
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    mongoDb = mongoClient.db(dbName);
    await Promise.all([
      mongoDb.collection("page_views").createIndex({ createdAt: -1 }),
      mongoDb.collection("page_views").createIndex({ game: 1, createdAt: -1 }),
      mongoDb.collection("redirects").createIndex({ createdAt: -1 }),
      mongoDb.collection("redirects").createIndex({ game: 1, createdAt: -1 }),
    ]);
  }

  return mongoDb;
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

async function insertAnalytics(collectionName, req, extra) {
  const db = await getDb();
  const ip = getClientIp(req);
  const geo = await getGeo(req, ip);
  const now = new Date();

  const doc = {
    ...extra,
    game: normalizeGame(extra.game),
    sessionId: String(extra.sessionId || "anonymous").slice(0, 128),
    ipHash: hashIp(ip),
    geo,
    userAgent: req.headers["user-agent"] || null,
    referrer: req.headers.referer || req.headers.referrer || null,
    createdAt: now,
  };

  await db.collection(collectionName).insertOne(doc);
  return doc;
}

app.post("/api/analytics/page-view", async (req, res) => {
  try {
    await insertAnalytics("page_views", req, {
      game: req.body.game,
      sessionId: req.body.sessionId,
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
      targetUrl: String(req.body.targetUrl || "").slice(0, 2048),
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

async function getAnalyticsSummary() {
  const db = await getDb();
  const [totalViews, totalRedirects, viewsByGame, redirectsByGame, locations, recentRedirects] =
    await Promise.all([
      db.collection("page_views").countDocuments(),
      db.collection("redirects").countDocuments(),
      db
        .collection("page_views")
        .aggregate([{ $group: { _id: "$game", count: { $sum: 1 } } }, { $sort: { count: -1 } }])
        .toArray(),
      db
        .collection("redirects")
        .aggregate([{ $group: { _id: "$game", count: { $sum: 1 } } }, { $sort: { count: -1 } }])
        .toArray(),
      db
        .collection("page_views")
        .aggregate([
          {
            $group: {
              _id: {
                country: { $ifNull: ["$geo.country", "Unknown"] },
                region: { $ifNull: ["$geo.region", "Unknown"] },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 25 },
        ])
        .toArray(),
      db
        .collection("redirects")
        .find({}, { projection: { game: 1, targetUrl: 1, geo: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray(),
    ]);

  return { totalViews, totalRedirects, viewsByGame, redirectsByGame, locations, recentRedirects };
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
      <table><thead><tr><th>Game</th><th>Visits</th></tr></thead><tbody>${rows(summary.viewsByGame, (x) => `<td>${escapeHtml(x._id)}</td><td>${x.count}</td>`)}</tbody></table>
    </section>
    <section>
      <h2>Redirects by game</h2>
      <table><thead><tr><th>Game</th><th>Redirects</th></tr></thead><tbody>${rows(summary.redirectsByGame, (x) => `<td>${escapeHtml(x._id)}</td><td>${x.count}</td>`)}</tbody></table>
    </section>
    <section>
      <h2>Locations</h2>
      <table><thead><tr><th>Country</th><th>Region</th><th>Visits</th></tr></thead><tbody>${rows(summary.locations, (x) => `<td>${escapeHtml(x._id.country)}</td><td>${escapeHtml(x._id.region)}</td><td>${x.count}</td>`)}</tbody></table>
    </section>
    <section>
      <h2>Recent redirects</h2>
      <table><thead><tr><th>Date</th><th>Game</th><th>Country</th><th>Region</th><th>Target</th></tr></thead><tbody>${rows(summary.recentRedirects, (x) => `<td>${escapeHtml(new Date(x.createdAt).toLocaleString())}</td><td>${escapeHtml(x.game)}</td><td>${escapeHtml(x.geo?.country || "Unknown")}</td><td>${escapeHtml(x.geo?.region || "Unknown")}</td><td>${escapeHtml(x.targetUrl || "")}</td>`)}</tbody></table>
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
    await getDb();
    res.json({ ok: true, db: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Lucky mini games server running on http://localhost:${port}`);
});
