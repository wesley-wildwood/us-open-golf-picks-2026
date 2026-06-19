import test from "node:test";
import assert from "node:assert/strict";
import scoresHandler from "../api/scores.js";

test("scores API shapes the live feed for the browser", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    events: [{
      id: "401811952",
      name: "U.S. Open",
      date: "2026-06-18T04:00Z",
      endDate: "2026-06-21T04:00Z",
      competitions: [{
        competitors: [{
          id: "10140",
          order: 2,
          score: "-3",
          athlete: { displayName: "Xander Schauffele", shortName: "X. Schauffele" },
          linescores: [
            { period: 1, value: 71, displayValue: "+1", linescores: Array.from({ length: 18 }, () => ({ value: 4 })) },
            { period: 2, value: 32, displayValue: "-4", linescores: Array.from({ length: 9 }, () => ({ value: 4 })) }
          ]
        }]
      }]
    }]
  }), { status: 200, headers: { "Content-Type": "application/json" } });

  let statusCode = 200;
  let body;
  const response = {
    status(code) { statusCode = code; return this; },
    json(value) { body = value; return this; }
  };

  try {
    await scoresHandler({ method: "GET" }, response);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(statusCode, 200);
  assert.equal(body.event.id, "401811952");
  assert.equal(body.event.currentRound, 2);
  assert.equal(body.players[0].name, "Xander Schauffele");
  assert.equal(body.players[0].rounds[2].status, "playing");
  assert.equal(body.snapshotSaved, false);
});
