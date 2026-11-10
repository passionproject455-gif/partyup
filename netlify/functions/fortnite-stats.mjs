// Netlify Function: looks up public Fortnite stats by Epic name through Fortnite-API.com.
// The API key stays secret on Netlify: add it as an environment variable named FORTNITE_API_KEY.
export default async (req) => {
  const url = new URL(req.url);
  const name = (url.searchParams.get("name") || "").trim();
  const headers = { "content-type": "application/json", "cache-control": "public, max-age=600" };
  const out = (status, body) => new Response(JSON.stringify(body), { status, headers });
  if (!name || name.length > 32) return out(400, { error: "Enter an Epic name." });
  const key = process.env.FORTNITE_API_KEY;
  if (!key) return out(503, { error: "Stats aren't set up yet." });
  try {
    const api = `https://fortnite-api.com/v2/stats/br/v2?name=${encodeURIComponent(name)}&timeWindow=lifetime`;
    const r = await fetch(api, { headers: { Authorization: key.trim() } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.data) console.log("fortnite-api", r.status, JSON.stringify(j).slice(0, 300));
    if (r.status === 401) return out(503, { error: "The stats key isn't valid. Check FORTNITE_API_KEY in Netlify." });
    if (r.status === 403) return out(403, { error: "This player's stats are private." });
    if (r.status === 404) return out(404, { error: "No Epic account found with that name." });
    if (r.status === 429) return out(429, { error: "Too many lookups right now. Try again in a minute." });
    if (!r.ok || !j.data) return out(502, { error: "Couldn't get stats right now." });
    const o = (j.data.stats && j.data.stats.all && j.data.stats.all.overall) || {};
    return out(200, {
      name: j.data.account ? j.data.account.name : name,
      level: j.data.battlePass ? j.data.battlePass.level : null,
      wins: o.wins ?? 0, kills: o.kills ?? 0, kd: o.kd ?? 0, matches: o.matches ?? 0, winRate: o.winRate ?? 0,
      updated: new Date().toISOString()
    });
  } catch (e) {
    console.log("fortnite-api fetch failed", String(e));
    return out(502, { error: "Couldn't get stats right now." });
  }
};
