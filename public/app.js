import { scoreGame } from "./scoring.js";

const REFRESH_MS = 60_000;
const elements = {
  sourcePill: document.querySelector("#source-pill"),
  sourceLabel: document.querySelector("#source-label"),
  refreshButton: document.querySelector("#refresh-button"),
  errorBanner: document.querySelector("#error-banner")
};

elements.refreshButton.addEventListener("click", loadScores);
loadScores();
window.setInterval(loadScores, REFRESH_MS);

async function loadScores() {
  setLoading(true);
  try {
    const response = await fetch("/api/scores", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || payload.error || `Request failed (${response.status})`);
    render(payload, scoreGame(payload));
    elements.errorBanner.hidden = true;
    elements.sourcePill.className = "source-pill live";
    elements.sourceLabel.textContent = payload.event.status || "Live scores";
  } catch (error) {
    elements.sourcePill.className = "source-pill delayed";
    elements.sourceLabel.textContent = "Scores delayed";
    elements.errorBanner.textContent = `Live scores are temporarily unavailable: ${error.message}`;
    elements.errorBanner.hidden = false;
  } finally {
    setLoading(false);
  }
}

function render(payload, game) {
  renderScoreCard("sean", game.Sean, game.Zach);
  renderScoreCard("zach", game.Zach, game.Sean);
  document.querySelector("#leader-text").textContent = game.leaderText;
  document.querySelector("#updated-at").textContent = `Updated ${formatTime(payload.updatedAt)}`;
  document.querySelector("#event-meta").textContent = `Round ${payload.event.currentRound} · Par ${payload.event.par} · Auto-refreshes every 60 seconds`;
  renderTeam("#sean-team", game.Sean);
  renderTeam("#zach-team", game.Zach);
  renderSideRows("#alt-table", game.altRows, false);
  renderSideRows("#best-ball-table", game.bestBallRows, true);
  document.querySelector("#alt-verdict").textContent = game.altText;
  document.querySelector("#best-ball-verdict").textContent = game.bestBallText;
}

function renderScoreCard(prefix, team, opponent) {
  const total = document.querySelector(`#${prefix}-total`);
  const match = document.querySelector(`#${prefix}-match`);
  const rounds = document.querySelector(`#${prefix}-rounds`);
  total.textContent = display(team.total);
  if (!Number.isFinite(team.total) || !Number.isFinite(opponent.total)) match.textContent = "Waiting";
  else if (team.total === opponent.total) match.textContent = "Tied";
  else if (team.total < opponent.total) match.textContent = `Up ${opponent.total - team.total}`;
  else match.textContent = `Down ${team.total - opponent.total}`;
  rounds.innerHTML = team.rounds.map((round, index) => `<span>R${index + 1}: ${display(round.total)}</span>`).join("");
}

function renderTeam(selector, team) {
  document.querySelector(selector).innerHTML = team.golfers.map((golfer, golferIndex) => `
    <tr>
      <td class="golfer-name">${escapeHtml(golfer.name)}</td>
      <td>${statusBadge(golfer)}</td>
      <td>${formatTournamentScore(golfer)}</td>
      ${golfer.rounds.map((round, roundIndex) => `<td class="${team.rounds[roundIndex].counting.includes(golferIndex) ? "counting" : ""}">${display(round)}</td>`).join("")}
    </tr>
  `).join("");
}

function renderSideRows(selector, rows, showPosition) {
  document.querySelector(selector).innerHTML = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.owner)}</td>
      <td class="golfer-name">${escapeHtml(row.name)}</td>
      <td>${statusBadge(row)}</td>
      <td>${showPosition ? formatPosition(row.position) : display(row.total)}</td>
    </tr>
  `).join("");
}

function statusBadge(golfer) {
  const status = golfer.status || "not_started";
  const label = status === "complete" ? "Finished" : status === "playing" ? `Thru ${golfer.holes}` : status === "missing" ? "Not found" : "Not started";
  return `<span class="status ${status}">${escapeHtml(label)}</span>`;
}

function formatTournamentScore(golfer) {
  if (!golfer.found) return "...";
  const toPar = golfer.tournamentToPar;
  const parText = toPar == null ? "" : toPar === 0 ? "E" : toPar > 0 ? `+${toPar}` : String(toPar);
  return `${display(golfer.total)}${parText ? ` (${parText})` : ""}`;
}

function formatPosition(position) {
  if (!position) return "...";
  return Number(position) === 1 ? "1" : `T${position}`;
}

function display(value) {
  return Number.isFinite(value) ? String(value) : "...";
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

function setLoading(loading) {
  elements.refreshButton.disabled = loading;
  elements.refreshButton.classList.toggle("loading", loading);
  elements.refreshButton.querySelector("span:last-child").textContent = loading ? "Refreshing" : "Refresh scores";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;"
  })[character]);
}
