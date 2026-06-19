const EVENT_ID = process.env.ESPN_EVENT_ID || "401811952";
const ESPN_URL = `https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?event=${EVENT_ID}`;

function parseToPar(value) {
  if (value === "E") return 0;
  if (value === "-" || value == null || value === "") return null;
  const parsed = Number.parseInt(String(value).replace("+", ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function teeTime(round) {
  const stats = round?.statistics?.categories?.[0]?.stats;
  const raw = stats?.find((item) => /\d{4}/.test(item.displayValue || ""))?.displayValue;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function inferCurrentRound(competitors) {
  const startedRounds = competitors.flatMap((competitor) =>
    (competitor.linescores || [])
      .filter((round) => (round.linescores?.length || 0) > 0 || (Number.isFinite(round.value) && round.value > 0))
      .map((round) => Number(round.period) || 1)
  );
  return Math.min(4, Math.max(1, ...startedRounds));
}

function shapePlayer(competitor, currentRound) {
  const rounds = {};
  for (const round of competitor.linescores || []) {
    const roundNumber = Number(round.period);
    if (!roundNumber || roundNumber > 4) continue;
    const holes = round.linescores?.length || 0;
    const strokes = Number.isFinite(round.value) && round.value > 0 ? round.value : null;
    const toPar = parseToPar(round.displayValue);
    rounds[roundNumber] = {
      strokes,
      toPar,
      holes,
      teeTime: teeTime(round),
      status: holes >= 18 ? "complete" : holes > 0 ? "playing" : "not_started"
    };
  }

  if (!rounds[currentRound]) {
    rounds[currentRound] = { strokes: null, toPar: null, holes: 0, teeTime: null, status: "not_started" };
  }

  return {
    id: competitor.id,
    name: competitor.athlete?.displayName,
    shortName: competitor.athlete?.shortName,
    country: competitor.athlete?.flag?.alt || null,
    flag: competitor.athlete?.flag?.href || null,
    tournamentToPar: parseToPar(competitor.score),
    position: competitor.order || null,
    rounds
  };
}

async function saveSnapshot(payload) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;

  const capturedMinute = new Date(payload.updatedAt);
  capturedMinute.setUTCSeconds(0, 0);
  const result = await fetch(`${url}/rest/v1/score_snapshots?on_conflict=event_id,captured_minute`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify({
      event_id: payload.event.id,
      event_status: payload.event.status,
      round_number: payload.event.currentRound,
      captured_minute: capturedMinute.toISOString(),
      payload
    })
  });

  if (!result.ok) {
    throw new Error(`Supabase snapshot returned ${result.status}`);
  }
  return true;
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const upstream = await fetch(ESPN_URL, { headers: { Accept: "application/json" } });
    if (!upstream.ok) throw new Error(`Live feed returned ${upstream.status}`);
    const data = await upstream.json();
    const event = data.events?.find((item) => item.id === EVENT_ID) || data.events?.[0];
    const competition = event?.competitions?.[0];
    if (!event || !competition) throw new Error("U.S. Open event was not found");

    const competitors = competition.competitors || [];
    const currentRound = inferCurrentRound(competitors);
    const payload = {
      event: {
        id: event.id,
        name: event.name || "U.S. Open",
        venue: "Shinnecock Hills Golf Club",
        par: 70,
        status: competition.status?.type?.description || event.status?.type?.description || "In progress",
        statusDetail: competition.status?.type?.detail || null,
        currentRound,
        startDate: event.date,
        endDate: event.endDate
      },
      players: competitors.map((competitor) => shapePlayer(competitor, currentRound)),
      updatedAt: new Date().toISOString(),
      source: "ESPN public scoreboard"
    };

    let snapshotSaved = false;
    try {
      snapshotSaved = await saveSnapshot(payload);
    } catch (snapshotError) {
      console.error(snapshotError);
    }

    return response.status(200).json({ ...payload, snapshotSaved });
  } catch (error) {
    return response.status(502).json({
      error: "Live scores are temporarily unavailable",
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}
