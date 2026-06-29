const redirectSites = [
  "https://wadavavr0bx.com/ru/register/?visit_id=5fb658ea-02db-4ee1-8b6c-bd56a745cc8d&settings=WWFUZFBiR3RsZ3BXL1lPZzhSOXQ5SWtuYzhOVUE2TExaQUx2Nm9PZ3FtY3MwK0NBUlB4UHhZYmorRTEzaitCK1haYXlRT0xkczBjc0xoeFRna3pOUnpCYVBFRXlKQjMvdnZ2bXUvZjUySktjU1JhQW52RTR3eTNvMTYyU2hJTzRsUGp5OVBxemtpenBjMG9kTlNRQzRPNXM2dWRacytUT1d1cmxRTTdyM1pFNlhwWFlsU2VZWXJ4aHI2MStoTTYxOjo4YWl0QndlbkVYZ28xZzdkeXB0a25RPT0%3D&promo=f6608bd5-fd80-4230-b6de-9331e84bc106&utm_referrer=https://allingaminghub.com/",
  "https://777.ua/?gclid=Cj0KCQjwjIPSBhCCARIsABGyK7t508wGRJALYrBMLtbByeFLiaF81iiVZjufLEWFDFINmZHQgERvN7IaAhBeEALw_wcB",
  "https://betking.com.ua/?gclid=Cj0KCQjwjIPSBhCCARIsABGyK7uNfJj1mvQOUrLGqmMUs7TyMBKIqKd2AW_rjaT5EaePUfFYd-rnjSgaArs0EALw_wcB",
];

const games = [
  {
    id: "wheel",
    title: "Lucky Spin Wheel",
    eyebrow: "Wheel of fortune",
    subtitle: "Spin the wheel and land the jackpot.",
  },
  {
    id: "slots",
    title: "Triple Lucky Slots",
    eyebrow: "3 in a row",
    subtitle: "Pull the lever and match the winning row.",
  },
  {
    id: "balloon",
    title: "Lucky Balloon Pop",
    eyebrow: "Press and hold",
    subtitle: "Inflate the balloon and chase the prize before it pops.",
  },
];

const wheelPrizes = ["Jackpot", "Gift", "Cashback", "Promo code", "25% Discount", "Surprise", "500 Points", "Free Spin"];
const wheelIcons = ["🏆", "🎁", "💸", "🎟️", "⭐", "🍋", "🔑", "🎰"];
const slotSymbols = ["7️⃣", "💎", "🍒", "🔔", "⭐", "🍋"];
const slotStripSymbols = [...slotSymbols, ...slotSymbols, ...slotSymbols, ...slotSymbols];
const names = ["William", "Olivia", "James", "Sarah", "Henry", "Emma"];

const gameStage = document.querySelector("#gameStage");
const title = document.querySelector("#app-title");
const eyebrow = document.querySelector("#gameEyebrow");
const subtitle = document.querySelector("#gameSubtitle");
const winsList = document.querySelector("#winsList");
const winOverlay = document.querySelector("#winOverlay");
const winPrize = document.querySelector("#winPrize");
const confettiLayer = document.querySelector("#confettiLayer");

const redirectEvery = 3;
const sessionId = localStorage.getItem("luckySessionId") || crypto.randomUUID();
localStorage.setItem("luckySessionId", sessionId);

const requestedGame = new URLSearchParams(window.location.search).get("game");
const selectedGame = games.find((game) => game.id === requestedGame) || games[Math.floor(Math.random() * games.length)];
let clientGeo = null;
let clientGeoPromise = resolveClientGeo();
let attemptsUsed = 0;
let wheelRotation = 0;
let isBusy = false;
let balloonTimer = null;
let balloonScale = 1;
let balloonGrowth = null;
let balloonResolved = false;
let winCloseTimer = null;

function timeout(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function resolveClientGeo() {
  const cached = sessionStorage.getItem("luckyClientGeo");
  if (cached) {
    clientGeo = JSON.parse(cached);
    return clientGeo;
  }

  try {
    const response = await fetch("https://ipwho.is/", { cache: "no-store" });
    const data = await response.json();
    if (!data.success) {
      return null;
    }

    clientGeo = {
      country: data.country || null,
      region: data.region || null,
      city: data.city || null,
    };
    sessionStorage.setItem("luckyClientGeo", JSON.stringify(clientGeo));
    return clientGeo;
  } catch {
    return null;
  }
}

async function track(path, payload) {
  await Promise.race([clientGeoPromise, timeout(900)]);
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, sessionId, clientGeo }),
    keepalive: true,
  }).catch(() => {});
}

function pickRedirectUrl() {
  return redirectSites[Math.floor(Math.random() * redirectSites.length)];
}

async function trackRedirectAndGo() {
  const targetUrl = pickRedirectUrl();
  await Promise.race([clientGeoPromise, timeout(600)]);
  const payload = JSON.stringify({ game: selectedGame.id, targetUrl, sessionId, clientGeo });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics/redirect", new Blob([payload], { type: "application/json" }));
  } else {
    await Promise.race([
      track("/api/analytics/redirect", { game: selectedGame.id, targetUrl }),
      new Promise((resolve) => window.setTimeout(resolve, 600)),
    ]);
  }

  window.setTimeout(() => {
    window.location.href = targetUrl;
  }, 1800);
}

function renderWins() {
  const prizes = ["£500", "Free Spins", "Cashback", "£320", "VIP Bonus", "£750"];
  const rows = Array.from({ length: 9 }, (_, index) => {
    const name = names[(index + attemptsUsed) % names.length];
    const prize = prizes[(index * 2 + attemptsUsed) % prizes.length];
    return `<div class="win-row"><span>🏆 ${name}</span><strong>Won ${prize}</strong></div>`;
  });
  winsList.innerHTML = rows.join("");
}

function launchConfetti() {
  confettiLayer.innerHTML = "";
  Array.from({ length: 180 }, (_, index) => {
    const piece = document.createElement("span");
    const isCoin = index % 5 === 0;
    const isSuit = index % 9 === 0;
    const size = isCoin ? 18 + Math.random() * 18 : isSuit ? 16 + Math.random() * 14 : 7 + Math.random() * 13;

    piece.className = isCoin ? "confetti-piece coin" : isSuit ? "confetti-piece suit" : "confetti-piece";
    piece.textContent = isCoin ? "●" : isSuit ? ["♠", "♥", "♦", "♣"][index % 4] : "";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.width = `${size}px`;
    piece.style.height = `${size}px`;
    piece.style.animationDelay = `${Math.random() * 1.25}s`;
    piece.style.animationDuration = `${3.1 + Math.random() * 2.6}s`;
    piece.style.setProperty("--drift", `${Math.random() * 420 - 210}px`);
    piece.style.setProperty("--spin", `${Math.random() * 1080 - 540}deg`);

    if (!isCoin && !isSuit) {
      const colors = ["#ffbd20", "#ff4d6d", "#31d0ff", "#6df178", "#b66dff", "#ffffff"];
      piece.style.background = colors[index % colors.length];
    }

    confettiLayer.appendChild(piece);
    window.setTimeout(() => piece.remove(), 6200);
  });
}

function showWinCelebration(label) {
  winPrize.textContent = label;
  winOverlay.setAttribute("aria-hidden", "false");
  winOverlay.classList.add("is-visible");
  document.body.classList.add("modal-open");
  document.body.classList.add("casino-win");
  launchConfetti();

  window.clearTimeout(winCloseTimer);
  winCloseTimer = window.setTimeout(closeWinCelebration, 2600);
}

function closeWinCelebration() {
  winOverlay.classList.remove("is-visible");
  winOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("casino-win", "modal-open");
}

winPrize.addEventListener("click", closeWinCelebration);

function setHeader() {
  title.textContent = selectedGame.title;
  eyebrow.textContent = selectedGame.eyebrow;
  subtitle.textContent = selectedGame.subtitle;
  document.body.dataset.game = selectedGame.id;
}

function buildWheel() {
  gameStage.innerHTML = `
    <div class="wheel-wrap">
      <div class="pointer" aria-hidden="true"></div>
      <div class="wheel" id="wheel" aria-hidden="true">
        ${wheelPrizes
          .map((prize, index) => `<div class="label label-${index + 1}"><span>${prize}</span><b>${wheelIcons[index]}</b></div>`)
          .join("")}
        <button class="wheel-center" id="spinCenter" type="button" aria-label="Spin the wheel"></button>
      </div>
    </div>
    <button class="spin-button" id="gameButton" type="button">Spin</button>
  `;

  document.querySelector("#gameButton").addEventListener("click", playWheel);
  document.querySelector("#spinCenter").addEventListener("click", playWheel);
}

function playWheel() {
  if (isBusy) return;
  isBusy = true;
  attemptsUsed += 1;

  const wheel = document.querySelector("#wheel");
  const button = document.querySelector("#gameButton");
  const isJackpot = attemptsUsed % redirectEvery === 0;
  const prizeIndex = isJackpot ? 0 : 1 + Math.floor(Math.random() * (wheelPrizes.length - 1));
  const sectorAngle = 45;
  const stopAngle = 360 - prizeIndex * sectorAngle;
  const currentAngle = wheelRotation % 360;
  const targetDelta = (stopAngle - currentAngle + 360) % 360;

  button.disabled = true;
  button.textContent = "Spinning...";
  wheelRotation += (5 + Math.floor(Math.random() * 3)) * 360 + targetDelta;
  wheel.style.transform = `rotate(${wheelRotation}deg)`;

  window.setTimeout(() => {
    renderWins();
    showWinCelebration(`${wheelIcons[prizeIndex]} ${wheelPrizes[prizeIndex]}`);
    button.disabled = false;
    button.textContent = "Spin";
    isBusy = false;
    if (isJackpot) trackRedirectAndGo();
  }, 4300);
}

function buildSlots() {
  gameStage.innerHTML = `
    <div class="slot-machine" id="slotMachine">
      <div class="slot-lights"></div>
      <div class="slot-top">
        <span>Lucky</span>
        <strong>777</strong>
        <span>Jackpot</span>
      </div>
      <div class="reels" id="reels">
        ${[0, 1, 2]
          .map(
            (index) => `
              <div class="reel-window" data-reel="${index}">
                <div class="reel-strip">
                  ${slotStripSymbols.map((symbol) => `<span>${symbol}</span>`).join("")}
                </div>
              </div>
            `
          )
          .join("")}
      </div>
      <div class="slot-lever" aria-hidden="true"><span></span></div>
      <div class="payline">Match 3 symbols to unlock the jackpot</div>
    </div>
    <button class="spin-button" id="gameButton" type="button">Pull Lever</button>
  `;
  document.querySelector("#gameButton").addEventListener("click", playSlots);
}

function playSlots() {
  if (isBusy) return;
  isBusy = true;
  attemptsUsed += 1;

  const machine = document.querySelector("#slotMachine");
  const reels = [...document.querySelectorAll(".reel-window")];
  const button = document.querySelector("#gameButton");
  const isJackpot = attemptsUsed % redirectEvery === 0;
  const result = isJackpot
    ? ["7️⃣", "7️⃣", "7️⃣"]
    : getNonWinningSlotResult();

  button.disabled = true;
  button.textContent = "Rolling...";
  machine.classList.remove("slot-win");
  machine.classList.add("slot-spinning");

  reels.forEach((reel, index) => {
    const strip = reel.querySelector(".reel-strip");
    const symbolIndex = slotSymbols.indexOf(result[index]);
    const finalIndex = slotSymbols.length * 3 + symbolIndex;
    const finalOffset = finalIndex * 88;

    strip.style.transition = "none";
    strip.style.transform = "translateY(0)";
    strip.getBoundingClientRect();
    reel.classList.add("is-spinning");

    window.setTimeout(() => {
      strip.style.transition = `transform ${1.65 + index * 0.38}s cubic-bezier(0.12, 0.82, 0.14, 1)`;
      strip.style.transform = `translateY(-${finalOffset}px)`;
    }, 40 + index * 120);

    window.setTimeout(() => {
      reel.classList.remove("is-spinning");
      reel.classList.add("has-stopped");
    }, 1900 + index * 430);
  });

  window.setTimeout(() => {
    reels.forEach((reel) => {
      reel.classList.remove("has-stopped");
    });
    renderWins();
    machine.classList.remove("slot-spinning");
    if (isJackpot) {
      machine.classList.add("slot-win");
    }
    showWinCelebration(isJackpot ? "🏆 Triple 7 Jackpot" : `${result.join(" ")} Bonus try`);
    button.disabled = false;
    button.textContent = "Pull Lever";
    isBusy = false;
    if (isJackpot) trackRedirectAndGo();
  }, 3300);
}

function getNonWinningSlotResult() {
  const result = Array.from({ length: 3 }, () => slotSymbols[1 + Math.floor(Math.random() * (slotSymbols.length - 1))]);

  if (result[0] === result[1] && result[1] === result[2]) {
    result[2] = slotSymbols[(slotSymbols.indexOf(result[2]) + 1) % slotSymbols.length] || "🍋";
  }

  return result;
}

function buildBalloon() {
  gameStage.innerHTML = `
    <div class="balloon-game" id="balloonPad">
      <div class="balloon-frame">
        <div class="balloon" id="balloon">💰</div>
        <div class="balloon-string"></div>
      </div>
      <p class="balloon-status" id="balloonStatus">Hold anywhere on the balloon to inflate.</p>
    </div>
    <button class="spin-button hold-button" id="gameButton" type="button">Hold to Inflate</button>
  `;

  const button = document.querySelector("#gameButton");
  const pad = document.querySelector("#balloonPad");
  [button, pad].forEach((element) => {
    element.addEventListener("pointerdown", startBalloon);
    element.addEventListener("pointerup", releaseBalloon);
    element.addEventListener("pointerleave", releaseBalloon);
    element.addEventListener("pointercancel", releaseBalloon);
  });
}

function startBalloon(event) {
  event.preventDefault();
  if (isBusy) return;
  isBusy = true;
  balloonResolved = false;
  attemptsUsed += 1;

  const balloon = document.querySelector("#balloon");
  const status = document.querySelector("#balloonStatus");
  const isJackpot = attemptsUsed % redirectEvery === 0;
  balloonScale = 0.62;
  balloon.classList.remove("popped", "winner");
  balloon.style.transform = `scale(${balloonScale})`;
  status.textContent = isJackpot ? "Keep holding... jackpot pressure is rising!" : "Careful... it can pop at any moment.";

  balloonGrowth = window.setInterval(() => {
    balloonScale = Math.min(balloonScale + 0.03, 1.18);
    balloon.style.transform = `scale(${balloonScale})`;
  }, 60);

  balloonTimer = window.setTimeout(
    () => {
      finishBalloon(isJackpot);
    },
    isJackpot ? 1400 : 700 + Math.random() * 1300
  );
}

function releaseBalloon() {
  if (!isBusy || balloonResolved) return;
  const isJackpot = attemptsUsed % redirectEvery === 0;
  if (isJackpot && balloonScale > 0.9) {
    finishBalloon(true);
    return;
  }
  finishBalloon(false);
}

function finishBalloon(isJackpot) {
  if (balloonResolved) return;
  balloonResolved = true;
  window.clearTimeout(balloonTimer);
  window.clearInterval(balloonGrowth);

  const balloon = document.querySelector("#balloon");
  const status = document.querySelector("#balloonStatus");
  balloon.classList.add(isJackpot ? "winner" : "popped");
  balloon.textContent = isJackpot ? "🏆" : "💥";
  status.textContent = isJackpot ? "Jackpot balloon unlocked!" : "Pop! Try once more.";

  renderWins();
  showWinCelebration(isJackpot ? "🏆 Balloon Jackpot" : "💥 Pop bonus");

  window.setTimeout(() => {
    balloon.classList.remove("popped", "winner");
    balloon.textContent = "💰";
    balloon.style.transform = "scale(0.62)";
    status.textContent = "Hold anywhere on the balloon to inflate.";
    isBusy = false;
  }, 1300);

  if (isJackpot) {
    trackRedirectAndGo();
  }
}

function initGame() {
  setHeader();
  renderWins();
  track("/api/analytics/page-view", { game: selectedGame.id });

  if (selectedGame.id === "wheel") buildWheel();
  if (selectedGame.id === "slots") buildSlots();
  if (selectedGame.id === "balloon") buildBalloon();
}

initGame();
