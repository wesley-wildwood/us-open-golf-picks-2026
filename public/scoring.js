export const COURSE_PAR = 70;

export const GAME = {
  eventId: "401811952",
  eventName: "U.S. Open",
  teams: {
    Sean: {
      starters: ["Xander Schauffele", "Matt Fitzpatrick", "Cameron Young", "Jon Rahm"],
      alt: "Patrick Reed",
      bestBall: "Sam Burns"
    },
    Zach: {
      starters: ["Scottie Scheffler", "Rory McIlroy", "Tommy Fleetwood", "Jordan Spieth"],
      alt: "Russell Henley",
      bestBall: "Brooks Koepka"
    }
  }
};

export function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[øöóòôõ]/g, "o")
    .replace(/æ/g, "ae")
    .replace(/[åáàâãä]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i")
    .replace(/[úùûü]/g, "u")
    .replace(/[ýÿ]/g, "y")
    .replace(/ñ/g, "n")
    .replace(/ç/g, "c")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function findPlayer(players, name) {
  const key = normalizeName(name);
  return players.find((player) => normalizeName(player.name) === key) || null;
}

export function projectedRoundScore(round, roundNumber, currentRound, coursePar = COURSE_PAR) {
  if (!round || roundNumber > currentRound) return null;
  if (round.status === "complete" && Number.isFinite(round.strokes)) return round.strokes;
  if (round.status === "playing" && Number.isFinite(round.toPar)) return coursePar + round.toPar;
  if (roundNumber === currentRound && round.status === "not_started") return coursePar;
  return null;
}

export function scoreGolfer(player, currentRound, coursePar = COURSE_PAR) {
  if (!player) {
    return {
      found: false,
      name: "Not found",
      status: "missing",
      holes: 0,
      tournamentToPar: null,
      position: null,
      rounds: [null, null, null, null],
      total: null
    };
  }

  const rounds = [1, 2, 3, 4].map((roundNumber) =>
    projectedRoundScore(player.rounds?.[roundNumber], roundNumber, currentRound, coursePar)
  );
  const current = player.rounds?.[currentRound];
  const completed = [...Array(currentRound)].map((_, index) => player.rounds?.[index + 1]).filter(Boolean);
  const latest = current || completed.at(-1) || null;
  const total = rounds.filter(Number.isFinite).reduce((sum, score) => sum + score, 0);

  return {
    found: true,
    ...player,
    status: latest?.status || "not_started",
    holes: latest?.holes || 0,
    rounds,
    total: rounds.some(Number.isFinite) ? total : null
  };
}

export function scoreTeam(starterNames, players, currentRound, coursePar = COURSE_PAR) {
  const golfers = starterNames.map((name) => {
    const scored = scoreGolfer(findPlayer(players, name), currentRound, coursePar);
    return { ...scored, name };
  });

  const rounds = [0, 1, 2, 3].map((roundIndex) => {
    const eligible = golfers
      .map((golfer, golferIndex) => ({ golferIndex, score: golfer.rounds[roundIndex] }))
      .filter((entry) => Number.isFinite(entry.score))
      .sort((a, b) => a.score - b.score);
    const counting = eligible.slice(0, 2);
    return {
      total: counting.length === 2 ? counting[0].score + counting[1].score : null,
      counting: counting.map((entry) => entry.golferIndex)
    };
  });

  const total = rounds.filter((round) => Number.isFinite(round.total)).reduce((sum, round) => sum + round.total, 0);
  return {
    golfers,
    rounds,
    total: rounds.some((round) => Number.isFinite(round.total)) ? total : null
  };
}

export function scoreGame(payload, game = GAME) {
  const currentRound = Math.min(4, Math.max(1, payload.event?.currentRound || 1));
  const coursePar = payload.event?.par || COURSE_PAR;
  const players = payload.players || [];
  const Sean = scoreTeam(game.teams.Sean.starters, players, currentRound, coursePar);
  const Zach = scoreTeam(game.teams.Zach.starters, players, currentRound, coursePar);
  const altRows = ["Sean", "Zach"].map((owner) => ({
    owner,
    ...scoreGolfer(findPlayer(players, game.teams[owner].alt), currentRound, coursePar),
    name: game.teams[owner].alt
  }));
  const bestBallRows = ["Sean", "Zach"].map((owner) => ({
    owner,
    ...scoreGolfer(findPlayer(players, game.teams[owner].bestBall), currentRound, coursePar),
    name: game.teams[owner].bestBall
  }));

  return {
    Sean,
    Zach,
    leaderText: matchupText(Sean, Zach),
    altRows,
    altText: alternateText(altRows),
    bestBallRows,
    bestBallText: bestBallText(bestBallRows)
  };
}

function matchupText(sean, zach) {
  if (!Number.isFinite(sean.total) || !Number.isFinite(zach.total)) return "Waiting for scores";
  const difference = sean.total - zach.total;
  if (difference === 0) return "All square";
  return difference < 0 ? `Sean leads by ${Math.abs(difference)}` : `Zach leads by ${difference}`;
}

function alternateText(rows) {
  if (!rows.every((row) => Number.isFinite(row.total))) return "Waiting for both alternate scores.";
  const difference = rows[0].total - rows[1].total;
  if (difference === 0) return "Alternate match is tied.";
  return `${rows[difference < 0 ? 0 : 1].owner} leads the alternate match by ${Math.abs(difference)}.`;
}

function bestBallText(rows) {
  const leaders = rows.filter((row) => Number(row.position) === 1);
  if (!leaders.length) return "No Best Ball pick currently leads the U.S. Open.";
  return `${leaders.map((row) => row.owner).join(" and ")} currently has a winning Best Ball pick.`;
}
