const redirectSites = [
  "https://wadavavr0bx.com/ru/register/?visit_id=5fb658ea-02db-4ee1-8b6c-bd56a745cc8d&settings=WWFUZFBiR3RsZ3BXL1lPZzhSOXQ5SWtuYzhOVUE2TExaQUx2Nm9PZ3FtY3MwK0NBUlB4UHhZYmorRTEzaitCK1haYXlRT0xkczBjc0xoeFRna3pOUnpCYVBFRXlKQjMvdnZ2bXUvZjUySktjU1JhQW52RTR3eTNvMTYyU2hJTzRsUGp5OVBxemtpenBjMG9kTlNRQzRPNXM2dWRacytUT1d1cmxRTTdyM1pFNlhwWFlsU2VZWXJ4aHI2MStoTTYxOjo4YWl0QndlbkVYZ28xZzdkeXB0a25RPT0%3D&promo=f6608bd5-fd80-4230-b6de-9331e84bc106&utm_referrer=https://allingaminghub.com/",
  "https://777.ua/?gclid=Cj0KCQjwjIPSBhCCARIsABGyK7t508wGRJALYrBMLtbByeFLiaF81iiVZjufLEWFDFINmZHQgERvN7IaAhBeEALw_wcB",
  "https://betking.com.ua/?gclid=Cj0KCQjwjIPSBhCCARIsABGyK7uNfJj1mvQOUrLGqmMUs7TyMBKIqKd2AW_rjaT5EaePUfFYd-rnjSgaArs0EALw_wcB",
];

const prizes = [
  "Jackpot",
  "Gift",
  "Cashback",
  "Promo code",
  "25% Discount",
  "Surprise",
  "500 Points",
  "Free Spin",
];

const jackpotIndex = 0;
const prizeIcons = ["🏆", "🎁", "💸", "🎟️", "⭐", "🍋", "🔑", "🎰"];
const names = ["William", "Olivia", "James", "Sarah", "Henry", "Emma"];

const wheel = document.querySelector("#wheel");
const spinButton = document.querySelector("#spinButton");
const spinCenter = document.querySelector("#spinCenter");
const winsList = document.querySelector("#winsList");
const winOverlay = document.querySelector("#winOverlay");
const winPrize = document.querySelector("#winPrize");
const confettiLayer = document.querySelector("#confettiLayer");

const redirectEvery = 3;
let attemptsUsed = Number(localStorage.getItem("fortuneAttemptsUsed") || 0);
let currentRotation = 0;
let isSpinning = false;

function renderWins() {
  const rows = Array.from({ length: 9 }, (_, index) => {
    const name = names[(index + attemptsUsed) % names.length];
    const prize = prizes[(index * 2 + attemptsUsed) % prizes.length];
    return `<div class="win-row"><span>🏆 ${name}</span><strong>Won ${prize}</strong></div>`;
  });

  winsList.innerHTML = rows.join("");
}

function pickRedirectUrl() {
  const siteIndex = Math.floor(Math.random() * redirectSites.length);
  return redirectSites[siteIndex];
}

function redirectAfterThirdSpin() {
  if (attemptsUsed % redirectEvery !== 0) {
    return;
  }

  const url = pickRedirectUrl();

  window.setTimeout(() => {
    window.location.href = url;
  }, 2600);
}

function launchConfetti() {
  confettiLayer.innerHTML = "";

  Array.from({ length: 62 }, (_, index) => {
    const piece = document.createElement("span");
    const isCoin = index % 4 === 0;
    const size = isCoin ? 18 + Math.random() * 16 : 8 + Math.random() * 10;

    piece.className = isCoin ? "confetti-piece coin" : "confetti-piece";
    piece.textContent = isCoin ? "●" : "";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.width = `${size}px`;
    piece.style.height = `${size}px`;
    piece.style.animationDelay = `${Math.random() * 0.7}s`;
    piece.style.animationDuration = `${2.4 + Math.random() * 1.8}s`;
    piece.style.setProperty("--drift", `${Math.random() * 220 - 110}px`);
    piece.style.setProperty("--spin", `${Math.random() * 720 - 360}deg`);

    if (!isCoin) {
      const colors = ["#ffbd20", "#ff4d6d", "#31d0ff", "#6df178", "#b66dff", "#ffffff"];
      piece.style.background = colors[index % colors.length];
    }

    confettiLayer.appendChild(piece);
    window.setTimeout(() => piece.remove(), 4600);
  });
}

function showWinCelebration(prizeIndex) {
  const icon = prizeIcons[prizeIndex] || "🏆";
  const prize = prizes[prizeIndex] || "Prize";

  winPrize.textContent = `${icon} ${prize}`;
  winOverlay.setAttribute("aria-hidden", "false");
  winOverlay.classList.add("is-visible");
  document.body.classList.add("casino-win");
  wheel.classList.add("win-pulse");
  launchConfetti();

  window.setTimeout(() => {
    winOverlay.classList.remove("is-visible");
    winOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("casino-win");
    wheel.classList.remove("win-pulse");
  }, 2500);
}

function spin() {
  if (isSpinning) {
    return;
  }

  isSpinning = true;
  spinButton.disabled = true;
  spinButton.textContent = "Spinning...";

  attemptsUsed += 1;
  localStorage.setItem("fortuneAttemptsUsed", String(attemptsUsed));

  const sectorAngle = 45;
  const isJackpotSpin = attemptsUsed % redirectEvery === 0;
  const prizeIndex = isJackpotSpin
    ? jackpotIndex
    : 1 + Math.floor(Math.random() * (prizes.length - 1));
  const fullTurns = 5 + Math.floor(Math.random() * 3);
  const stopAngle = 360 - prizeIndex * sectorAngle;
  const currentAngle = currentRotation % 360;
  const targetDelta = (stopAngle - currentAngle + 360) % 360;

  currentRotation += fullTurns * 360 + targetDelta;
  wheel.style.transform = `rotate(${currentRotation}deg)`;

  window.setTimeout(() => {
    renderWins();
    showWinCelebration(prizeIndex);
    redirectAfterThirdSpin();

    spinButton.disabled = false;
    spinButton.textContent = "Spin";

    isSpinning = false;
  }, 4300);
}

spinButton.addEventListener("click", spin);
spinCenter.addEventListener("click", spin);

renderWins();
