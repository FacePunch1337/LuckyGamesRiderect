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

const wheelPrizes = ["50 Free Spins", "5 Free Spins", "10 Free Spins", "15 Free Spins", "20 Free Spins", "25 Free Spins", "30 Free Spins", "40 Free Spins"];
const gamePrompts = {
  wheel: {
    kicker: "FREE SPINS",
    copy: "Spin the wheel and land on the jackpot.",
  },
  slots: {
    kicker: "3 IN A ROW",
    copy: "Pull the lever and match the winning row.",
  },
  plane: {
    kicker: "HOLD TO FLY",
    copy: "Reach x5 and unlock the jackpot.",
  },
};
const slotSymbols = [
  { id: "seven", label: "Seven", src: "/games/slots/assets/images/Seven.png" },
  { id: "cherry", label: "Cherry", src: "/games/slots/assets/images/Cherry.png" },
  { id: "grape", label: "Grape", src: "/games/slots/assets/images/Grape.png" },
  { id: "watermelon", label: "Watermelon", src: "/games/slots/assets/images/Watermelon.png" },
  { id: "lemon", label: "Lemon", src: "/games/slots/assets/images/Lemon.png" },
];
const slotStripSymbols = [...slotSymbols, ...slotSymbols, ...slotSymbols, ...slotSymbols, ...slotSymbols, ...slotSymbols];
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
  plane: {
    background: "/games/plane/assets/audio/background.mp3",
    explosion: "/games/plane/assets/audio/bang.mp3",
    win: "/games/plane/assets/audio/win.mp3",
    scoreTick: "/games/plane/assets/audio/scoreTick.mp3",
  },
};

const gameStage = document.querySelector("#gameStage");
const title = document.querySelector("#app-title");
const eyebrow = document.querySelector("#gameEyebrow");
const subtitle = document.querySelector("#gameSubtitle");
const attemptsInfo = document.querySelector("#attemptsInfo");
const gamePrompt = document.querySelector("#gamePrompt");
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
document.body.classList.add(`theme-${selectedGame.id}`);
document.body.classList.add("game-intro-active");
let clientGeo = null;
let clientGeoPromise = resolveClientGeo();
let attemptsUsed = 0;
let wheelRotation = 0;
let isBusy = false;
let planeTimer = null;
let planeAnimationFrame = null;
let planeResolved = false;
let planeMultiplier = 1;
let planeTargetMultiplier = 2.1;
let planeProgress = 0;
let lastPlaneMotion = null;
let planeStartedAt = 0;
let planePath = null;
let planeLastAngle = 0;
let planeRenderX = null;
let planeRenderY = null;
let planeLastScoreTickValue = 0;
let planeLastScoreTickAt = 0;
let winCloseTimer = null;
let audioUnlocked = false;
let gameSounds = null;
let pendingMusicStart = false;
let slotSpinSoundFrame = null;
let slotSpinSoundSwitchTimer = null;
let slotSpinLastCenterIndex = null;
let slotSpinLastTickAt = 0;

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

  gameSounds = {};
  if (files.background) {
    gameSounds.background = new Audio(files.background);
  }
  if (files.action) {
    gameSounds.action = new Audio(files.action);
  }
  if (files.win) {
    gameSounds.win = new Audio(files.win);
  }
  if (files.explosion) {
    gameSounds.explosion = new Audio(files.explosion);
  }
  if (files.scoreTick) {
    gameSounds.scoreTick = new Audio(files.scoreTick);
  }
  if (gameSounds.background) {
    gameSounds.background.loop = true;
    gameSounds.background.volume = 0.32;
  }
  if (gameSounds.action) {
    gameSounds.action.loop = Boolean(files.loopAction);
    gameSounds.action.volume = files.actionVolume || 0.72;
  }
  if (gameSounds.win) {
    gameSounds.win.volume = 0.88;
  }
  if (gameSounds.explosion) {
    gameSounds.explosion.volume = 0.9;
  }
  if (gameSounds.scoreTick) {
    gameSounds.scoreTick.volume = 0.9;
  }
  Object.values(gameSounds).forEach((audio) => {
    audio.preload = "auto";
  });
  return gameSounds;
}

function setButtonLabel(button, label) {
  button.textContent = label;
  button.dataset.label = label;
  button.setAttribute("aria-label", label);
}

function applyGameButtonAsset(button) {
  const imagePath = `/games/${selectedGame.id}/assets/images/button.png`;
  const image = new Image();

  image.onload = () => {
    button.classList.add("has-image-button");
    button.style.setProperty("--button-image", `url("${imagePath}")`);
    button.style.setProperty("--button-aspect", `${image.naturalWidth} / ${image.naturalHeight}`);
  };

  image.onerror = () => {
    button.classList.remove("has-image-button");
    button.style.removeProperty("--button-image");
    button.style.removeProperty("--button-aspect");
  };

  image.src = imagePath;
}

function safePlay(audio) {
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {
    pendingMusicStart = true;
  });
}

function startBackgroundMusic() {
  const background = getGameSounds()?.background;
  if (!background) return;
  background.play().catch(() => {
    pendingMusicStart = true;
  });
}

function stopSound(audio) {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
}

function playSlotSpinTick(source, volume = 0.68) {
  if (!source) return;
  const tick = source.cloneNode(true);
  tick.loop = false;
  tick.volume = volume;
  tick.currentTime = 0;
  tick.play().catch(() => {});
}

function playPlaneScoreTick(currentValue) {
  if (!audioUnlocked) return;
  const source = getGameSounds()?.scoreTick;
  if (!source) return;

  const now = performance.now();
  const delta = currentValue - planeLastScoreTickValue;
  if (Math.abs(delta) < 0.07 || now - planeLastScoreTickAt < 85) return;

  const tick = source.cloneNode(true);
  const normalized = clamp(currentValue / 5, 0, 1);
  tick.loop = false;
  tick.volume = 0.72 + normalized * 0.22;
  tick.playbackRate = delta > 0
    ? 1.05 + normalized * 0.72
    : 0.52 + normalized * 0.36;
  tick.preservesPitch = false;
  tick.webkitPreservesPitch = false;
  tick.mozPreservesPitch = false;
  tick.currentTime = 0;
  tick.play().catch(() => {});
  planeLastScoreTickAt = now;
  planeLastScoreTickValue = currentValue;
}

function stopSlotSpinSound() {
  if (slotSpinSoundFrame) {
    cancelAnimationFrame(slotSpinSoundFrame);
  }
  window.clearTimeout(slotSpinSoundSwitchTimer);
  slotSpinSoundFrame = null;
  slotSpinSoundSwitchTimer = null;
  slotSpinLastCenterIndex = null;
  slotSpinLastTickAt = 0;
}

function getTranslateY(element) {
  const transform = window.getComputedStyle(element).transform;
  if (!transform || transform === "none") return 0;
  const matrix = new DOMMatrixReadOnly(transform);
  return matrix.m42;
}

function startSlotSpinSound(strip, cellHeight) {
  if (!audioUnlocked) return;
  const source = getGameSounds()?.action;
  if (!source || !strip || !cellHeight) return;

  stopSlotSpinSound();
  slotSpinLastCenterIndex = Math.round(Math.abs(getTranslateY(strip)) / cellHeight);
  slotSpinLastTickAt = 0;

  const tick = () => {
    const now = performance.now();
    const centerIndex = Math.round(Math.abs(getTranslateY(strip)) / cellHeight);

    if (centerIndex !== slotSpinLastCenterIndex) {
      slotSpinLastCenterIndex = centerIndex;
      if (now - slotSpinLastTickAt >= 86) {
        slotSpinLastTickAt = now;
        playSlotSpinTick(source, 0.68);
      }
    }

    slotSpinSoundFrame = requestAnimationFrame(tick);
  };

  slotSpinSoundFrame = requestAnimationFrame(tick);
}

function unlockGameAudio() {
  const sounds = getGameSounds();
  if (!sounds) return;
  audioUnlocked = true;
  startBackgroundMusic();
}

function unlockAudioFromGesture() {
  unlockGameAudio();
  if (pendingMusicStart) {
    pendingMusicStart = false;
    startBackgroundMusic();
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

function updateAttemptsInfo() {
  const mod = attemptsUsed % redirectEvery;
  const remaining = attemptsUsed > 0 && mod === 0 ? 0 : redirectEvery - mod;
  attemptsInfo.textContent = `Attempts left: ${remaining}/${redirectEvery}`;
}

function getGameLogoPath() {
  return `/games/${selectedGame.id}/assets/images/logo.png`;
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
  document.body.dataset.game = selectedGame.id;
  eyebrow.textContent = "";
  title.innerHTML = `<img class="game-logo-title" src="${getGameLogoPath()}" alt="${selectedGame.title}">`;
  subtitle.textContent = "";
  const prompt = gamePrompts[selectedGame.id] || { kicker: "PLAY NOW", copy: "Unlock the jackpot reward." };
  gamePrompt.innerHTML = `
    <span class="game-prompt-kicker">${prompt.kicker}</span>
    <span class="game-prompt-copy">${prompt.copy}</span>
  `;
}

function buildWheel() {
  gameStage.innerHTML = `
    <div class="wheel-wrap">
      <div class="pointer" aria-hidden="true"></div>
      <div class="wheel" id="wheel" aria-hidden="true">
        ${wheelPrizes
          .map(
            (prize, index) =>
              `<div class="label label-${index + 1}"><span class="label-number">${prize.split(" ")[0]}</span><span class="label-caption">Free Spins</span></div>`,
          )
          .join("")}
        <button class="wheel-center" id="spinCenter" type="button" aria-label="Spin the wheel"></button>
      </div>
    </div>
    <button class="spin-button" id="gameButton" type="button" data-label="Spin" aria-label="Spin">Spin</button>
  `;

  const button = document.querySelector("#gameButton");
  applyGameButtonAsset(button);
  button.addEventListener("click", playWheel);
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
  setButtonLabel(button, "Spinning...");
  if (audioUnlocked) {
    safePlay(getGameSounds()?.action);
  }
  wheelRotation += (5 + Math.floor(Math.random() * 3)) * 360 + targetDelta;
  wheel.style.transform = `rotate(${wheelRotation}deg)`;

  window.setTimeout(() => {
    showWinCelebration(wheelPrizes[prizeIndex]);
    button.disabled = false;
    setButtonLabel(button, "Spin");
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
                  ${slotStripSymbols.map(renderSlotSymbol).join("")}
                </div>
              </div>
            `
          )
          .join("")}
      </div>
      <div class="slot-lever" aria-hidden="true"><span></span></div>
    </div>
    <button class="spin-button" id="gameButton" type="button" data-label="Pull Lever" aria-label="Pull Lever">Pull Lever</button>
  `;
  const button = document.querySelector("#gameButton");
  applyGameButtonAsset(button);
  button.addEventListener("click", playSlots);
  requestAnimationFrame(syncSlotReelMetrics);
}

function renderSlotSymbol(symbol) {
  return `<span class="slot-symbol" data-symbol="${symbol.id}"><img src="${symbol.src}" alt="${symbol.label}" draggable="false" /></span>`;
}

function syncSlotReelMetrics() {
  document.querySelectorAll(".reel-window").forEach((reel) => {
    const strip = reel.querySelector(".reel-strip");
    if (!strip) return;
    const reelCellHeight = reel.clientHeight || 88;
    strip.style.setProperty("--reel-cell-height", `${reelCellHeight}px`);
  });
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
    ? [slotSymbols[0], slotSymbols[0], slotSymbols[0]]
    : getNonWinningSlotResult();

  button.disabled = true;
  setButtonLabel(button, "Rolling...");
  if (message) message.textContent = "Reels are spinning...";
  unlockGameAudio();
  machine.classList.remove("slot-win");
  machine.classList.add("slot-spinning");
  syncSlotReelMetrics();

  reels.forEach((reel, index) => {
    const strip = reel.querySelector(".reel-strip");
    const symbolIndex = slotSymbols.findIndex((symbol) => symbol.id === result[index].id);
    const extraSpin = index === reels.length - 1 ? slotSymbols.length * 2 : 0;
    const finalIndex = slotSymbols.length * 3 + symbolIndex + extraSpin;
    const reelCellHeight = reel.clientHeight || 88;
    const finalOffset = finalIndex * reelCellHeight;

    strip.style.transition = "none";
    strip.style.setProperty("--reel-cell-height", `${reelCellHeight}px`);
    strip.style.transform = "translateY(0)";
    strip.getBoundingClientRect();
    reel.classList.add("is-spinning");

    window.setTimeout(() => {
      const reelDuration = 1.25 + index * 0.3 + (index === reels.length - 1 ? 1.3 : 0);
      strip.style.transition = `transform ${reelDuration}s cubic-bezier(0.12, 0.82, 0.14, 1)`;
      strip.style.transform = `translateY(-${finalOffset}px)`;
    }, 40 + index * 120);

    window.setTimeout(() => {
      reel.classList.remove("is-spinning");
    }, 1500 + index * 340 + (index === reels.length - 1 ? 1300 : 0));
  });

  const firstReel = reels[0];
  const firstStrip = firstReel?.querySelector(".reel-strip");
  const lastReel = reels[reels.length - 1];
  const lastStrip = lastReel?.querySelector(".reel-strip");
  startSlotSpinSound(firstStrip, firstReel?.clientHeight || 88);
  slotSpinSoundSwitchTimer = window.setTimeout(() => {
    startSlotSpinSound(lastStrip, lastReel?.clientHeight || 88);
  }, 280);

  window.setTimeout(() => {
    machine.classList.remove("slot-spinning");
    stopSlotSpinSound();
    if (isJackpot) {
      machine.classList.add("slot-win");
      if (message) message.textContent = "Triple 7 jackpot unlocked!";
      showWinCelebration("Triple 7 Jackpot");
    } else {
      if (message) message.textContent = "No match. Try again.";
    }
    button.disabled = false;
    setButtonLabel(button, "Pull Lever");
    isBusy = false;
    if (isJackpot) trackRedirectAndGo();
  }, 3900);
}

function getNonWinningSlotResult() {
  const fruitSymbols = slotSymbols.slice(1);
  const result = Array.from({ length: 3 }, () => fruitSymbols[Math.floor(Math.random() * fruitSymbols.length)]);

  if (result[0].id === result[1].id && result[1].id === result[2].id) {
    const currentIndex = fruitSymbols.findIndex((symbol) => symbol.id === result[2].id);
    result[2] = fruitSymbols[(currentIndex + 1) % fruitSymbols.length];
  }

  return result;
}

function buildPlane() {
  gameStage.innerHTML = `
    <div class="plane-game" id="planePad">
      <div class="sky-track" id="skyTrack">
        <img class="cloud cloud-1" src="/games/plane/assets/images/claude-clean.png" alt="" aria-hidden="true">
        <img class="cloud cloud-2" src="/games/plane/assets/images/claude-clean.png" alt="" aria-hidden="true">
        <img class="cloud cloud-3" src="/games/plane/assets/images/claude-clean.png" alt="" aria-hidden="true">
        <svg class="plane-trail" id="planeTrailSvg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path id="planeTrailGlow" d=""></path>
          <path id="planeTrail" d=""></path>
        </svg>
        <div class="multiplier-badge" id="planeMultiplier">x1.00</div>
        <div class="plane" id="plane">
          <img src="/games/plane/assets/images/plane-cropped.png" alt="Plane" draggable="false">
        </div>
      </div>
    </div>
    <button class="spin-button hold-button" id="gameButton" type="button" data-label="Hold to Fly" aria-label="Hold to Fly">Hold to Fly</button>
  `;

  const button = document.querySelector("#gameButton");
  const pad = document.querySelector("#planePad");
  applyGameButtonAsset(button);
  resetPlanePosition();
  [button, pad].forEach((element) => {
    element.addEventListener("pointerdown", startPlane);
    element.addEventListener("pointerup", releasePlane);
    element.addEventListener("pointerleave", releasePlane);
    element.addEventListener("pointercancel", releasePlane);
  });

}

function runGameIntro() {
  const intro = selectedGame.id === "plane"
    ? createPlaneIntro()
    : selectedGame.id === "wheel"
      ? createWheelIntro()
      : selectedGame.id === "slots"
        ? createSlotsIntro()
        : createBasicGameIntro();
  document.body.appendChild(intro);

  const duration = selectedGame.id === "plane" ? 2450 : selectedGame.id === "wheel" ? 2300 : selectedGame.id === "slots" ? 2500 : 1250;
  window.setTimeout(() => {
    document.body.classList.remove("game-intro-active");
    intro.classList.add("is-out");
  }, duration);

  window.setTimeout(() => {
    intro.remove();
  }, duration + 600);
}

function createPlaneIntro() {
  const intro = document.createElement("div");
  intro.className = "game-intro plane-intro";
  intro.setAttribute("aria-hidden", "true");
  intro.innerHTML = `
    <div class="plane-intro-sky">
      <img class="intro-cloud intro-cloud-left" src="/games/plane/assets/images/claude-clean.png" alt="">
      <img class="intro-cloud intro-cloud-right" src="/games/plane/assets/images/claude-clean.png" alt="">
      <img class="intro-cloud intro-cloud-top-left" src="/games/plane/assets/images/claude-clean.png" alt="">
      <img class="intro-cloud intro-cloud-top-right" src="/games/plane/assets/images/claude-clean.png" alt="">
      <img class="intro-plane" src="/games/plane/assets/images/introPlane.png" alt="">
      <img class="intro-logo" src="/games/plane/assets/images/logo.png" alt="PlaneGG">
    </div>
  `;
  return intro;
}

function createWheelIntro() {
  const intro = document.createElement("div");
  intro.className = "game-intro wheel-intro";
  intro.setAttribute("aria-hidden", "true");
  intro.innerHTML = `
    <div class="wheel-intro-sky">
      <span class="wheel-star wheel-star-1"></span>
      <span class="wheel-star wheel-star-2"></span>
      <span class="wheel-star wheel-star-3"></span>
      <span class="wheel-star wheel-star-4"></span>
      <span class="wheel-petal wheel-petal-1"></span>
      <span class="wheel-petal wheel-petal-2"></span>
      <span class="wheel-petal wheel-petal-3"></span>
      <img class="wheel-intro-moon" src="/games/wheel/assets/images/moon.png" alt="">
      <img class="wheel-intro-logo" src="/games/wheel/assets/images/logo.png" alt="Katana Spins">
    </div>
  `;
  return intro;
}

function createSlotsIntro() {
  const intro = document.createElement("div");
  intro.className = "game-intro slots-intro";
  intro.setAttribute("aria-hidden", "true");
  intro.innerHTML = `
    <video class="slots-intro-video" autoplay muted loop playsinline preload="auto">
      <source src="/games/slots/assets/images/IntroBackground.mp4" type="video/mp4">
    </video>
    <div class="slots-intro-stage">
      <img class="slots-intro-lightning slots-intro-lightning-left" src="/games/slots/assets/images/Lighting.png" alt="">
      <img class="slots-intro-lightning slots-intro-lightning-right" src="/games/slots/assets/images/Lighting.png" alt="">
      <img class="slots-intro-zeus" src="/games/slots/assets/images/LogoZeus.png" alt="">
      <img class="slots-intro-logo" src="/games/slots/assets/images/logo.png" alt="Royals Slot">
    </div>
  `;
  return intro;
}

function createBasicGameIntro() {
  const intro = document.createElement("div");
  intro.className = `game-intro basic-intro basic-intro-${selectedGame.id}`;
  intro.setAttribute("aria-hidden", "true");
  intro.innerHTML = `
    <div class="basic-intro-card">
      <div class="basic-intro-icon">${selectedGame.id === "wheel" ? "🎡" : "777"}</div>
      <strong>${selectedGame.title}</strong>
    </div>
  `;
  return intro;
}

function resetPlanePosition() {
  const sky = document.querySelector("#skyTrack");
  const plane = document.querySelector("#plane");
  const badge = document.querySelector("#planeMultiplier");
  if (!sky || !plane || !badge) return;

  plane.classList.remove("crashed", "winner");
  plane.style.removeProperty("transition");
  clearPlaneTrail();
  planePath = createPlanePath(sky, false, true);
  planeLastAngle = planePath.startAngle;
  const motion = getPlaneMotion(sky, 0, planePath);
  motion.angle = planePath.startAngle;
  planeRenderX = motion.x;
  planeRenderY = motion.y;
  plane.style.transform = `translate(${motion.x}px, ${motion.y}px) rotate(${motion.angle}deg)`;
  badge.style.transform = `translate(${motion.badgeX}px, ${motion.badgeY}px)`;
  badge.textContent = "x0.00";
}

function resetPlaneRound() {
  planeResolved = false;
  planeProgress = 0;
  planeMultiplier = 0;
  lastPlaneMotion = null;
  planeStartedAt = 0;
  planeRenderX = null;
  planeRenderY = null;
  planeLastScoreTickValue = 0;
  planeLastScoreTickAt = 0;
  resetPlanePosition();
}

function startPlane(event) {
  event.preventDefault();
  if (isBusy) return;
  resetPlaneRound();
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
  planeMultiplier = 0;
  planeProgress = 0;
  lastPlaneMotion = null;
  planeStartedAt = 0;
  planeTargetMultiplier = 5;
  planePath = createPlanePath(sky, isJackpot);
  planeLastAngle = planePath.startAngle;
  planeRenderX = null;
  planeRenderY = null;
  planeLastScoreTickValue = 0;
  planeLastScoreTickAt = 0;
  plane.classList.remove("crashed", "winner");
  sky.classList.add("is-flying");
  if (status) status.textContent = isJackpot ? "Keep holding. Maximum flight is charging!" : "Hold steady. Turbulence ahead.";
  badge.textContent = "x0.00";
  clearPlaneTrail();

  const animatePlane = (timestamp) => {
    planeStartedAt ||= timestamp;
    const elapsed = timestamp - planeStartedAt;
    planeProgress = Math.min(elapsed / planePath.duration, 1);
    const motion = getPlaneMotion(sky, planeProgress, planePath);
    lastPlaneMotion = motion;
    const previousMultiplier = planeMultiplier;
    planeMultiplier = motion.multiplier;

    plane.style.transform = `translate(${motion.x}px, ${motion.y}px) rotate(${motion.angle}deg)`;
    badge.style.transform = `translate(${motion.badgeX}px, ${motion.badgeY}px)`;
    badge.textContent = `x${planeMultiplier.toFixed(2)}`;
    playPlaneScoreTick(planeMultiplier);
    updatePlaneTrail(sky, planePath, planeProgress);

    if (isJackpot && planeMultiplier >= planeTargetMultiplier - 0.01) {
      planeMultiplier = planeTargetMultiplier;
      badge.textContent = `x${planeMultiplier.toFixed(2)}`;
      finishPlane(true);
      return;
    }

    if (!isJackpot && planeProgress >= planePath.crashAt) {
      planeMultiplier = 0;
      badge.textContent = "x0.00";
      finishPlane(false);
      return;
    }

    if (!planeResolved) {
      planeAnimationFrame = window.requestAnimationFrame(animatePlane);
    }
  };

  planeAnimationFrame = window.requestAnimationFrame(animatePlane);
}

function createPlanePath(sky, isJackpot, idle = false) {
  const width = sky.clientWidth || 340;
  const height = sky.clientHeight || 238;
  const planeElement = document.querySelector("#plane");
  const planeWidth = planeElement?.offsetWidth || 126;
  const planeHeight = planeElement?.offsetHeight || 78;
  const left = 18;
  const right = width - planeWidth - 20;
  const top = 18;
  const bottom = height - planeHeight - 18;
  const range = Math.max(1, bottom - top);

  if (idle) {
    return {
      points: [{ t: 0, x: left, y: bottom }, { t: 1, x: left + 80, y: bottom }],
      top,
      bottom,
      range,
      duration: 1000,
      crashAt: 1,
      startAngle: 0,
    };
  }

  const jitter = (amount) => (Math.random() - 0.5) * amount;
  const midDip = bottom - range * (0.28 + Math.random() * 0.12);
  const winPoints = [
    { t: 0, x: left, y: bottom },
    { t: 0.14, x: left + (right - left) * 0.16, y: bottom - range * (0.2 + Math.random() * 0.08) },
    { t: 0.28, x: left + (right - left) * 0.31, y: bottom - range * (0.5 + Math.random() * 0.08) },
    { t: 0.42, x: left + (right - left) * 0.46, y: midDip },
    { t: 0.58, x: left + (right - left) * 0.62, y: bottom - range * (0.64 + Math.random() * 0.08) },
    { t: 0.74, x: left + (right - left) * 0.78, y: bottom - range * (0.86 + Math.random() * 0.05) },
    { t: 1, x: right, y: top },
  ];
  const losePoints = [
    { t: 0, x: left, y: bottom },
    { t: 0.18, x: left + (right - left) * 0.2, y: bottom - range * (0.24 + Math.random() * 0.08) },
    { t: 0.36, x: left + (right - left) * 0.4, y: bottom - range * (0.5 + Math.random() * 0.08) },
    { t: 0.54, x: left + (right - left) * 0.58, y: bottom - range * (0.58 + Math.random() * 0.08) },
    { t: 0.64, x: left + (right - left) * 0.68, y: bottom - range * (0.34 + Math.random() * 0.07) },
    { t: 0.73, x: left + (right - left) * 0.74, y: bottom - range * (0.54 + Math.random() * 0.09) },
    { t: 0.84, x: left + (right - left) * 0.8, y: bottom - range * (0.2 + Math.random() * 0.07) },
    { t: 0.94, x: left + (right - left) * 0.85, y: bottom + jitter(3) },
    { t: 1, x: left + (right - left) * 0.88, y: bottom },
  ];

  return {
    points: isJackpot ? winPoints : losePoints,
    top,
    bottom,
    range,
    duration: isJackpot ? 5000 + Math.random() * 350 : 4700 + Math.random() * 420,
    crashAt: isJackpot ? 1 : 0.92,
    startAngle: 0,
  };
}

function smoothStep(value) {
  return value * value * (3 - 2 * value);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function interpolatePlanePoint(points, progress) {
  const t = clamp(progress, 0, 1);
  let index = 0;
  while (index < points.length - 2 && t > points[index + 1].t) index += 1;

  const p0 = points[Math.max(0, index - 1)];
  const p1 = points[index];
  const p2 = points[index + 1];
  const p3 = points[Math.min(points.length - 1, index + 2)];
  const span = Math.max(0.001, p2.t - p1.t);
  const localT = clamp((t - p1.t) / span, 0, 1);
  const localT2 = localT * localT;
  const localT3 = localT2 * localT;
  const catmull = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * localT + (2 * a - 5 * b + 4 * c - d) * localT2 + (-a + 3 * b - 3 * c + d) * localT3);

  return {
    x: catmull(p0.x, p1.x, p2.x, p3.x),
    y: catmull(p0.y, p1.y, p2.y, p3.y),
  };
}

function lerpAngle(from, to, amount) {
  const delta = ((to - from + 540) % 360) - 180;
  return from + delta * amount;
}

function getPlaneMotion(sky, progress, path = planePath) {
  const width = sky.clientWidth || 340;
  const height = sky.clientHeight || 238;
  const planeElement = document.querySelector("#plane");
  const planeWidth = planeElement?.offsetWidth || 126;
  const planeHeight = planeElement?.offsetHeight || 78;
  const current = interpolatePlanePoint(path.points, progress);
  const next = interpolatePlanePoint(path.points, Math.min(1, progress + 0.012));
  const rawAngle = Math.atan2(next.y - current.y, next.x - current.x) * 180 / Math.PI;
  const angle = lerpAngle(planeLastAngle, rawAngle, 0.06);
  planeLastAngle = angle;
  const targetX = clamp(current.x, 8, width - planeWidth - 8);
  const targetY = clamp(current.y, 8, height - planeHeight - 8);
  planeRenderX = planeRenderX === null ? targetX : planeRenderX + (targetX - planeRenderX) * 0.24;
  planeRenderY = planeRenderY === null ? targetY : planeRenderY + (targetY - planeRenderY) * 0.24;
  const altitude = clamp((path.bottom - targetY) / path.range, 0, 1);
  const multiplier = altitude * 5;

  return {
    x: Number(planeRenderX.toFixed(2)),
    y: Number(planeRenderY.toFixed(2)),
    angle: Number(angle.toFixed(2)),
    multiplier,
    badgeX: Number(clamp(planeRenderX + planeWidth * 0.45, 14, width - 92).toFixed(2)),
    badgeY: Number(clamp(planeRenderY - 36, 12, height - 42).toFixed(2)),
  };
}

function clearPlaneTrail() {
  document.querySelector("#planeTrail")?.setAttribute("d", "");
  document.querySelector("#planeTrailGlow")?.setAttribute("d", "");
}

function updatePlaneTrail(sky, path, progress) {
  const trail = document.querySelector("#planeTrail");
  const glow = document.querySelector("#planeTrailGlow");
  if (!trail || !glow || !path) return;
  const planeElement = document.querySelector("#plane");
  const planeWidth = planeElement?.offsetWidth || 126;
  const planeHeight = planeElement?.offsetHeight || 78;
  const samples = 46;
  const end = clamp(progress, 0, 1);
  const points = [];

  for (let i = 0; i <= samples; i += 1) {
    const sampleT = end * (i / samples);
    const point = interpolatePlanePoint(path.points, sampleT);
    points.push({
      x: ((point.x + planeWidth * 0.22) / sky.clientWidth) * 100,
      y: ((point.y + planeHeight * 0.28) / sky.clientHeight) * 100,
    });
  }

  if (points.length < 2) return;
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} `;
  for (let i = 1; i < points.length - 1; i += 1) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    d += `Q ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)} `;
  }
  const last = points[points.length - 1];
  d += `T ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;

  trail.setAttribute("d", d);
  glow.setAttribute("d", d);
}

function releasePlane() {
  if (!isBusy || planeResolved) return;
  finishPlane(false);
}

function finishPlane(isJackpot) {
  if (planeResolved) return;
  planeResolved = true;
  window.clearTimeout(planeTimer);
  window.cancelAnimationFrame(planeAnimationFrame);
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
  if (status) {
    status.textContent = isJackpot ? `Max flight reached: x${planeMultiplier.toFixed(2)}!` : `Crashed at x${planeMultiplier.toFixed(2)}. Try again.`;
  }
  if (audioUnlocked && !isJackpot) {
    safePlay(getGameSounds()?.explosion);
  }

  if (isJackpot) {
    planeMultiplier = planeTargetMultiplier;
    showWinCelebration(`Flight x${planeMultiplier.toFixed(2)} Jackpot`);
  }

  window.setTimeout(() => {
    sky.classList.remove("is-flying");
    resetPlaneRound();
    document.querySelector("#planeMultiplier").textContent = "x0.00";
    if (status) status.textContent = "Hold to take off.";
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
  updateAttemptsInfo();
  startBackgroundMusic();
  track("/api/analytics/page-view", { game: selectedGame.id });

  if (selectedGame.id === "wheel") buildWheel();
  if (selectedGame.id === "slots") buildSlots();
  if (selectedGame.id === "plane") buildPlane();
  runGameIntro();
}

initGame();
window.addEventListener("resize", syncSlotReelMetrics);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && audioUnlocked) {
    startBackgroundMusic();
  }
});
