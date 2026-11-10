// Netlify Function: looks up public Fortnite stats by Epic name through Fortnite-API.com.
// The API key stays secret on Netlify: add it as an environment variable named FORTNITE_API_KEY.
export default async (req) => {
  const url = new URL(req.url);
  const name = (url.searchParams.get("name") || "").trim();
  const headers = { "content-type": "application/json", "cache-control": "public, max-age=600" };
  if (!name || name.length > 32) return new Response(JSON.stringify({ error: "Enter an Epic name." }), { status: 400, headers });
  const key = process.env.FORTNITE_API_KEY;
  if (!key) return new Response(JSON.stringify({ error: "Stats aren't set up yet." }), { status: 503, headers });
  try {
    const api = `https://fortnite-api.com/v2/stats/br/v2?name=${encodeURIComponent(name)}&accountType=epic&timeWindow=lifetime`;
    const r = await fetch(api, { headers: { Authorization: key } });
    const j = await r.json().catch(() => ({}));
    if (r.status === 403) return new Response(JSON.stringify({ error: "This player's stats are private." }), { status: 403, headers });
    if (r.status === 404) return new Response(JSON.stringify({ error: "No Epic account found with that name." }), { status: 404, headers });
    if (!r.ok || !j.data) return new Response(JSON.stringify({ error: "Couldn't get stats right now." }), { status: 502, headers });
    const o = (j.data.stats && j.data.stats.all && j.data.stats.all.overall) || {};
    const out = {
      name: j.data.account ? j.data.account.name : name,
      level: j.data.battlePass ? j.data.battlePass.level : null,
      wins: o.wins ?? 0, kills: o.kills ?? 0, kd: o.kd ?? 0, matches: o.matches ?? 0, winRate: o.winRate ?? 0,
      updated: new Date().toISOString()
    };
    return new Response(JSON.stringify(out), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Couldn't get stats right now." }), { status: 502, headers });
  }
};
