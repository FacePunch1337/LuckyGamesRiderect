if (window.location.protocol === "file:") {
  window.location.replace(`http://localhost:3000/${window.location.search}`);
  throw new Error("Lucky Spin Games must be opened through http://localhost:3000, not file://");
}

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
    id: "plane",
    title: "Lucky Flight",
    eyebrow: "Press and hold",
    subtitle: "Hold to fly higher and chase the jackpot multiplier.",
  },
];

const wheelPrizes = ["Jackpot", "Gift", "Cashback", "Promo code", "25% Discount", "Surprise", "500 Points", "Free Spin"];
const wheelIcons = ["🏆", "🎁", "💸", "🎟️", "⭐", "🍋", "🔑", "🎰"];
const slotSymbols = ["7️⃣", "💎", "🍒", "🔔", "⭐", "🍋"];
const slotStripSymbols = [...slotSymbols, ...slotSymbols, ...slotSymbols, ...slotSymbols];
const names = ["William", "Olivia", "James", "Sarah", "Henry", "Emma"];
const gameAudioFiles = {
  wheel: {
    background: "/games/wheel/assets/audio/background.mp3",
    action: "/games/wheel/assets/audio/spin.mp3",
    win: "/games/wheel/assets/audio/win.mp3",
  },
  slots: {
    background: "/games/slots/assets/audio/background.mp3",
    action: "/games/slots/assets/audio/spin.mp3",
    win: "/games/slots/assets/audio/win.mp3",
  },
};

const gameStage = document.querySelector("#gameStage");
const title = document.querySelector("#app-title");
const eyebrow = document.querySelector("#gameEyebrow");
const subtitle = document.querySelector("#gameSubtitle");
const attemptsInfo = document.querySelector("#attemptsInfo");
const winsList = document.querySelector("#winsList");
const winOverlay = document.querySelector("#winOverlay");
const winPrize = document.querySelector("#winPrize");
const confettiLayer = document.querySelector("#confettiLayer");

const redirectEvery = 3;
const minPlaneExplosionMultiplier = 2.5;
const sessionId = localStorage.getItem("luckySessionId") || crypto.randomUUID();
localStorage.setItem("luckySessionId", sessionId);

const requestedGameRaw = new URLSearchParams(window.location.search).get("game");
const requestedGame = requestedGameRaw === "balloon" ? "plane" : requestedGameRaw;
const selectedGame = games.find((game) => game.id === requestedGame) || games[Math.floor(Math.random() * games.length)];
let clientGeo = null;
let clientGeoPromise = resolveClientGeo();
let attemptsUsed = 0;
let wheelRotation = 0;
let isBusy = false;
let planeTimer = null;
let planeTicker = null;
let planeResolved = false;
let planeMultiplier = 1;
let planeTargetMultiplier = 2.1;
let planeProgress = 0;
let lastPlaneMotion = null;
let winCloseTimer = null;
let audioUnlocked = false;
let gameSounds = null;
let pendingMusicStart = false;

function timeout(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getGameSounds() {
  const files = gameAudioFiles[selectedGame.id];
  if (!files) {
    return null;
  }

  if (gameSounds) {
    return gameSounds;
  }

  gameSounds = {
    background: new Audio(files.background),
    action: new Audio(files.action),
    win: new Audio(files.win),
  };
  if (files.explosion) {
    gameSounds.explosion = new Audio(files.explosion);
  }
  gameSounds.background.loop = true;
  gameSounds.action.loop = Boolean(files.loopAction);
  gameSounds.background.volume = 0.32;
  gameSounds.action.volume = files.actionVolume || 0.72;
  gameSounds.win.volume = 0.88;
  if (gameSounds.explosion) {
    gameSounds.explosion.volume = 0.9;
  }
  Object.values(gameSounds).forEach((audio) => {
    audio.preload = "auto";
  });
  return gameSounds;
}

function safePlay(audio) {
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {
    pendingMusicStart = true;
  });
}

function stopSound(audio) {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
}

function unlockGameAudio() {
  const sounds = getGameSounds();
  if (!sounds) return;
  audioUnlocked = true;
  sounds.background.play().catch(() => {
    pendingMusicStart = true;
  });
}

function unlockAudioFromGesture() {
  unlockGameAudio();
  if (pendingMusicStart) {
    pendingMusicStart = false;
    getGameSounds()?.background.play().catch(() => {});
  }
}

["pointerdown", "touchstart", "keydown"].forEach((eventName) => {
  window.addEventListener(eventName, unlockAudioFromGesture, { once: true, passive: true });
});

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

function updateAttemptsInfo() {
  const mod = attemptsUsed % redirectEvery;
  const remaining = attemptsUsed > 0 && mod === 0 ? 0 : redirectEvery - mod;
  attemptsInfo.textContent = `Attempts left: ${remaining}/${redirectEvery}`;
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
  if (audioUnlocked) {
    safePlay(getGameSounds()?.win);
  }
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
  updateAttemptsInfo();
  unlockGameAudio();

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
  if (audioUnlocked) {
    safePlay(getGameSounds()?.action);
  }
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
      <div class="payline" id="slotMessage">Match 3 symbols to unlock the jackpot</div>
    </div>
    <button class="spin-button" id="gameButton" type="button">Pull Lever</button>
  `;
  document.querySelector("#gameButton").addEventListener("click", playSlots);
}

function playSlots() {
  if (isBusy) return;
  isBusy = true;
  attemptsUsed += 1;
  updateAttemptsInfo();

  const machine = document.querySelector("#slotMachine");
  const reels = [...document.querySelectorAll(".reel-window")];
  const button = document.querySelector("#gameButton");
  const message = document.querySelector("#slotMessage");
  const isJackpot = attemptsUsed % redirectEvery === 0;
  const result = isJackpot
    ? ["7️⃣", "7️⃣", "7️⃣"]
    : getNonWinningSlotResult();

  button.disabled = true;
  button.textContent = "Rolling...";
  message.textContent = "Reels are spinning...";
  unlockGameAudio();
  if (audioUnlocked) {
    safePlay(getGameSounds()?.action);
  }
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
      message.textContent = "Triple 7 jackpot unlocked!";
      showWinCelebration("🏆 Triple 7 Jackpot");
    } else {
      message.textContent = "No match. Try again.";
    }
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

function buildPlane() {
  gameStage.innerHTML = `
    <div class="plane-game" id="planePad">
      <div class="sky-track" id="skyTrack">
        <div class="cloud cloud-1"></div>
        <div class="cloud cloud-2"></div>
        <div class="cloud cloud-3"></div>
        <div class="multiplier-badge" id="planeMultiplier">x1.00</div>
        <div class="plane" id="plane">
          <img src="/games/plane/assets/images/plane-cropped.png" alt="Plane" draggable="false">
        </div>
      </div>
      <p class="plane-status" id="planeStatus">Hold to take off.</p>
    </div>
    <button class="spin-button hold-button" id="gameButton" type="button">Hold to Fly</button>
  `;

  const button = document.querySelector("#gameButton");
  const pad = document.querySelector("#planePad");
  resetPlanePosition();
  [button, pad].forEach((element) => {
    element.addEventListener("pointerdown", startPlane);
    element.addEventListener("pointerup", releasePlane);
    element.addEventListener("pointerleave", releasePlane);
    element.addEventListener("pointercancel", releasePlane);
  });
}

function resetPlanePosition() {
  const sky = document.querySelector("#skyTrack");
  const plane = document.querySelector("#plane");
  const badge = document.querySelector("#planeMultiplier");
  if (!sky || !plane || !badge) return;

  const motion = getPlaneMotion(sky, 0);
  plane.style.transform = `translate(${motion.x}px, ${motion.y}px) rotate(${motion.angle}deg)`;
  badge.style.transform = `translate(${motion.badgeX}px, ${motion.badgeY}px)`;
}

function startPlane(event) {
  event.preventDefault();
  if (isBusy) return;
  isBusy = true;
  planeResolved = false;
  attemptsUsed += 1;
  updateAttemptsInfo();
  unlockGameAudio();
  if (audioUnlocked) {
    safePlay(getGameSounds()?.action);
  }

  const plane = document.querySelector("#plane");
  const sky = document.querySelector("#skyTrack");
  const badge = document.querySelector("#planeMultiplier");
  const status = document.querySelector("#planeStatus");
  const isJackpot = attemptsUsed % redirectEvery === 0;
  planeMultiplier = 1;
  planeProgress = 0;
  lastPlaneMotion = null;
  planeTargetMultiplier = isJackpot ? 5 : 1.7 + Math.random() * 0.8;
  plane.classList.remove("crashed", "winner");
  sky.classList.add("is-flying");
  status.textContent = isJackpot ? "Keep holding. Maximum flight is charging!" : "Hold steady. Turbulence ahead.";
  badge.textContent = "x1.00";

  planeTicker = window.setInterval(() => {
    planeMultiplier = isJackpot
      ? Math.min(planeMultiplier + 0.045, planeTargetMultiplier)
      : planeMultiplier + 0.031;
    planeProgress = Math.min((planeMultiplier - 1) / 4, 1);
    const motion = getPlaneMotion(sky, planeProgress);
    lastPlaneMotion = motion;

    plane.style.transform = `translate(${motion.x}px, ${motion.y}px) rotate(${motion.angle}deg)`;
    badge.style.transform = `translate(${motion.badgeX}px, ${motion.badgeY}px)`;
    badge.textContent = `x${planeMultiplier.toFixed(2)}`;

    if (isJackpot && planeMultiplier >= planeTargetMultiplier) {
      finishPlane(true);
    }
  }, 32);

  planeTimer = window.setTimeout(
    () => {
      finishPlane(isJackpot);
    },
    isJackpot ? 2600 : 1650 + Math.random() * 650
  );
}

function getPlaneMotion(sky, progress) {
  const width = sky.clientWidth || 340;
  const height = sky.clientHeight || 238;
  const planeElement = document.querySelector("#plane");
  const planeWidth = planeElement?.offsetWidth || 126;
  const planeHeight = planeElement?.offsetHeight || 78;
  const t = Math.max(0, Math.min(progress, 1));
  const centerX = (width - planeWidth) / 2;
  const centerY = (height - planeHeight) / 2;
  const phase = t * Math.PI * 6.4;
  const x = centerX;
  const y = centerY;
  const baseAngle = -15;
  const pitch = -Math.cos(phase) * 7;

  return {
    x: Math.round(Math.max(16, Math.min(width - planeWidth - 16, x))),
    y: Math.round(Math.max(18, Math.min(height - planeHeight - 18, y))),
    angle: Math.round(baseAngle + pitch),
    badgeX: Math.round(Math.max(14, Math.min(width - 86, x + planeWidth * 0.35))),
    badgeY: Math.round(Math.max(12, Math.min(height - 42, y - 40))),
  };
}

function releasePlane() {
  if (!isBusy || planeResolved) return;
  const isJackpot = attemptsUsed % redirectEvery === 0;
  if (!isJackpot && planeMultiplier < minPlaneExplosionMultiplier) {
    return;
  }

  if (isJackpot && planeMultiplier >= 4.75) {
    finishPlane(true);
    return;
  }
  finishPlane(false);
}

function finishPlane(isJackpot) {
  if (planeResolved) return;
  planeResolved = true;
  window.clearTimeout(planeTimer);
  window.clearInterval(planeTicker);
  stopSound(getGameSounds()?.action);

  const plane = document.querySelector("#plane");
  const sky = document.querySelector("#skyTrack");
  const status = document.querySelector("#planeStatus");
  if (isJackpot) {
    sky.classList.remove("is-flying");
    plane.classList.add("winner");
  } else {
    explodePlane(plane, sky);
  }
  status.textContent = isJackpot ? `Max flight reached: x${planeMultiplier.toFixed(2)}!` : `Crashed at x${planeMultiplier.toFixed(2)}. Try again.`;
  if (audioUnlocked && !isJackpot) {
    safePlay(getGameSounds()?.explosion);
  }

  renderWins();
  if (isJackpot) {
    planeMultiplier = planeTargetMultiplier;
    showWinCelebration(`✈ x${planeMultiplier.toFixed(2)} Jackpot`);
  }

  window.setTimeout(() => {
    sky.classList.remove("is-flying");
    plane.classList.remove("crashed", "winner");
    plane.style.removeProperty("transition");
    resetPlanePosition();
    document.querySelector("#planeMultiplier").textContent = "x1.00";
    status.textContent = "Hold to take off.";
    isBusy = false;
  }, 1300);

  if (isJackpot) {
    trackRedirectAndGo();
  }
}

function explodePlane(plane, sky) {
  const crashMotion = lastPlaneMotion || getPlaneMotion(sky, planeProgress);

  plane.classList.add("crashed");
  plane.style.transition = "none";
  plane.style.transform = `translate(${crashMotion.x}px, ${crashMotion.y}px) rotate(${crashMotion.angle}deg)`;
}

function initGame() {
  setHeader();
  renderWins();
  updateAttemptsInfo();
  track("/api/analytics/page-view", { game: selectedGame.id });

  if (selectedGame.id === "wheel") buildWheel();
  if (selectedGame.id === "slots") buildSlots();
  if (selectedGame.id === "plane") buildPlane();
}

initGame();
