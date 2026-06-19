import test from "node:test";
import assert from "node:assert/strict";
import { normalizeName, projectedRoundScore, scoreGame, scoreTeam } from "../public/scoring.js";

function player(name, roundOne, roundTwoToPar, status = "playing") {
  return {
    id: name,
    name,
    tournamentToPar: roundOne - 70 + (roundTwoToPar || 0),
    position: 10,
    rounds: {
      1: { strokes: roundOne, toPar: roundOne - 70, holes: 18, status: "complete" },
      2: { strokes: null, toPar: roundTwoToPar, holes: status === "playing" ? 9 : 0, status },
      3: { strokes: null, toPar: null, holes: 0, status: "not_started" }
    }
  };
}

test("best two projected rounds count each day", () => {
  const players = [
    player("One", 68, -1),
    player("Two", 70, -3),
    player("Three", 67, 2),
    player("Four", 72, 0)
  ];
  const result = scoreTeam(players.map((item) => item.name), players, 2, 70);
  assert.equal(result.rounds[0].total, 135);
  assert.equal(result.rounds[1].total, 136);
  assert.equal(result.total, 271);
});

test("not-started golfers project to par only in the current round", () => {
  const round = { strokes: null, toPar: null, holes: 0, status: "not_started" };
  assert.equal(projectedRoundScore(round, 2, 2, 70), 70);
  assert.equal(projectedRoundScore(round, 3, 2, 70), null);
});

test("future placeholder rounds never create phantom scores", () => {
  const players = ["A", "B", "C", "D"].map((name) => player(name, 70, 0));
  const result = scoreTeam(["A", "B", "C", "D"], players, 2, 70);
  assert.equal(result.rounds[2].total, null);
  assert.equal(result.rounds[3].total, null);
});

test("Nordic characters normalize consistently", () => {
  assert.equal(normalizeName("Nicolai Højgaard"), normalizeName("Nicolai Hojgaard"));
});

test("U.S. Open picks produce both team scores", () => {
  const names = [
    "Xander Schauffele", "Matt Fitzpatrick", "Cameron Young", "Jon Rahm", "Patrick Reed", "Sam Burns",
    "Scottie Scheffler", "Rory McIlroy", "Tommy Fleetwood", "Jordan Spieth", "Russell Henley", "Brooks Koepka"
  ];
  const payload = {
    event: { currentRound: 2, par: 70 },
    players: names.map((name, index) => ({ ...player(name, 68 + (index % 4), index % 3), position: index + 1 }))
  };
  const result = scoreGame(payload);
  assert.ok(Number.isFinite(result.Sean.total));
  assert.ok(Number.isFinite(result.Zach.total));
  assert.equal(result.altRows.length, 2);
  assert.equal(result.bestBallRows.length, 2);
});
