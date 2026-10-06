(() => {
  const landingView = document.getElementById("landingView");
  const gameView = document.getElementById("gameView");
  const enterGameBtn = document.getElementById("enterGameBtn");
  const musicToggleButtons = document.querySelectorAll("[data-music-toggle]");

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  let WIDTH = 800;
  const HEIGHT = 400;
  const GROUND_Y = 340;

  // 💡 設定高分通關目標（可自行調整，例如 2000 分才能看到終點）
  const WIN_SCORE = 2000;
  const RAINBOW_SCORE = 1000;
  const GAME_LIMIT_MS = 10 * 60 * 1000;

  const ecoValueEl = document.getElementById("ecoValue");
  const ecoBarFill = document.getElementById("ecoBarFill");
  const scoreValueEl = document.getElementById("scoreValue");
  const livesValueEl = document.getElementById("livesValue");
  const timerValueEl = document.getElementById("timerValue");
  const gameOverOverlay = document.getElementById("gameOverOverlay");
  const gameOverText = document.getElementById("gameOverText");
  const finalScoreEl = document.getElementById("finalScore");
  const restartBtn = document.getElementById("restartBtn");
  const charBtns = document.querySelectorAll(".btn-char");
  const leaderboardList = document.getElementById("leaderboardList");

  const GRAVITY = 0.65;
  const FIRST_JUMP_VELOCITY = -14.5;
  const SECOND_JUMP_VELOCITY = -13.0;
  const MOVE_SPEED = 4.5;
  const MAX_LIVES = 5;
  const combo = { count: 0, best: 0, notice: 0, effect: 0, celebration: false };
  const comboCountEl = document.getElementById("comboCount");
  const comboToast = document.getElementById("comboToast");
  const SMOKE_STAGES = [
    { cycle: 6000, erupt: 800 },
    { cycle: 5000, erupt: 1000 },
    { cycle: 4000, erupt: 1200 }
  ];
  const SMOKE_WARNING_MS = 1000;

  let selectedCharacter = "char17";
  const CHARACTERS = {
    char17: { name: "🛡 守護護盾", key: "1", description: "4 秒內抵擋垃圾、煙囪與 CO₂", duration: 4000, cooldown: 12000, color: "#6bd9ff" },
    char18: { name: "🧲 回收磁力", key: "2", description: "6 秒內吸附附近 180 像素的回收物與補給", duration: 6000, cooldown: 14000, color: "#ff83c1" },
    char19: { name: "🌱 淨化脈衝", key: "3", description: "清除附近 260 像素的 CO₂，並增加 10 點 Eco", duration: 1000, cooldown: 16000, color: "#9df08f" }
  };
  const skillBtn = document.getElementById("skillBtn");
  const skillNameEl = document.getElementById("skillName");
  const skillStatusEl = document.getElementById("skillStatus");
  const skillEffectEl = document.getElementById("skillEffect");
  const skillProgress = document.getElementById("skillProgress");
  const skillProgressFill = document.getElementById("skillProgressFill");
  const openingHint = document.getElementById("openingHint");
  const openingSkillHint = document.getElementById("openingSkillHint");
  const rulesView = document.getElementById("rulesView");
  const openRulesBtn = document.getElementById("openRulesBtn");
  const backToHomeBtn = document.getElementById("backToHomeBtn");
  const touchButtons = {
    left: document.getElementById("touchLeftBtn"),
    right: document.getElementById("touchRightBtn"),
    jump: document.getElementById("touchJumpBtn")
  };
  const touchPointers = new Map();
  const touchDevice = window.matchMedia?.("(any-pointer: coarse)")?.matches || false;
  let fullscreenRequestPending = false;
  function enterPhoneFullscreen() {
    if (!touchDevice || location.hostname === "appassets.androidplatform.net" || document.fullscreenElement || window.matchMedia?.("(display-mode: fullscreen)")?.matches || navigator.standalone === true || fullscreenRequestPending || !document.documentElement.requestFullscreen) return;
    try {
      fullscreenRequestPending = true;
      const request = document.documentElement.requestFullscreen();
      if (request && typeof request.then === "function") {
        request.then(() => { fullscreenRequestPending = false; }, () => { fullscreenRequestPending = false; });
      } else fullscreenRequestPending = false;
    } catch { fullscreenRequestPending = false; }
  }
  const eventCard = document.getElementById("eventCard");
  const eventNameEl = document.getElementById("eventName");
  const eventDescriptionEl = document.getElementById("eventDescription");
  const eventCountdownEl = document.getElementById("eventCountdown");
  const ability = { remaining: 0, cooldown: 0 };
  const EVENTS = {
    supply: { name: "🎁 清潔隊補給", description: "前方有 4 份補給，快去收集！", duration: 6000 },
    wind: { name: "🍃 強風來襲", description: "順風推向右方；逆風移動會變慢。", duration: 8000 },
    smog: { name: "🌫 霧霾警報", description: "煙囪更頻繁噴氣，善用跳躍和技能！", duration: 8000 }
  };
  const eventState = { type: null, remaining: 0, nextAt: 8000, lastType: null };

  const charImages = {
    char17: new Image(),
    char18: new Image(),
    char19: new Image()
  };

  charImages.char17.src = "17.png";
  charImages.char18.src = "18.png";
  charImages.char19.src = "19.png";
  const itemImages = {};
  [21, 22, 23, 25, 26, 27, 28].forEach((id) => {
    itemImages[id] = new Image();
    itemImages[id].src = `${id}.png`;
  });

  // 19.png 的原始素材右側帶有白色直線，灰髮男孩使用裁切區域避開它。
  const charCrop = {
    char19: { sx: 540, sy: 220, sw: 165, sh: 270 }
  };
  const SCENES = [
    { id: "city", name: "🏙 繽紛城市", threshold: 0, surface: 0.75, ground: "#c5c4b3", soil: "#94704e", obstacleChance: 0.48, recycleChance: 0.68, spacing: 220, safeItems: [25, 27], dangerItems: [22, 23], obstacle: "chimney", hint: "穿越街道，回收紙箱與鋁罐。", rainbowX: 0.52 },
    { id: "river", name: "🏞 山谷河岸", threshold: 600, surface: 0.80, ground: "#a7ce67", soil: "#be864e", obstacleChance: 0.38, recycleChance: 0.75, spacing: 250, safeItems: [26, 27], dangerItems: [21, 28], obstacle: "rock", hint: "高低石頭交錯：小石頭單跳，高石柱二段跳！", rainbowX: 0.50 },
    { id: "forest", name: "🌳 陽光森林", threshold: 1200, surface: 0.79, ground: "#91bd58", soil: "#896747", obstacleChance: 0.43, recycleChance: 0.80, spacing: 240, safeItems: [25, 26], dangerItems: [21, 23], obstacle: "stump", hint: "深入森林，跳過樹樁並清理留下的垃圾。", rainbowX: 0.51 }
  ];
  SCENES.forEach(scene => { scene.image = new Image(); scene.image.src = `assets/scenes/${scene.id}.png`; });
  const scenery = { index: 0, previous: 0, transition: 1200, rainbow: 0, riverGroups: 0, notice: 0, speedFactor: 1 };
  const sceneNameEl = document.getElementById("sceneName");
  const sceneHintEl = document.getElementById("sceneHint");


  const STATE = { START: "start", PLAYING: "playing", GAMEOVER: "gameover" };

  let state = STATE.START;
  let lastTime = 0;
  let simulationRemainder = 0;
  const FRAME_MS = 1000 / 60;
  let gameTime = 0;
  let homeTimer = null;
  let keys = { left: false, right: false };

  const player = {
    x: 100,
    y: GROUND_Y - 80,
    w: 60,
    h: 80,
    vx: 0,
    vy: 0,
    jumpsLeft: 2,
    invincible: 0,
    knockbackRemaining: 0,
    knockbackVx: 0,
    facing: "right",
    animTimer: 0
  };

  const world = {
    cameraX: 0,
    ecoScore: 50,
    score: 0,
    lives: 3,
    lastGeneratedX: 400, // 記錄最後生成地圖物件的位置
    finishFlagX: null,    // 達標時出現的終點線 X 座標
    obstacles: [],
    trashes: [],
    pickups: [],
    smokeParticles: []
  };

  charBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      charBtns.forEach(b => { b.classList.remove("active"); b.setAttribute("aria-pressed", "false"); });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      selectedCharacter = btn.getAttribute("data-char");
      updateAdventureHud();
    });
  });

  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

  function collectCombo() {
    combo.count += 1;
    combo.best = Math.max(combo.best, combo.count);
    if (combo.count % 10 === 0) {
      world.score += 100;
      comboToast.textContent = `🌱 環保達人！ ${combo.count} 連段 · 額外 +100 分`;
      combo.notice = 2400;
      combo.effect = 2000;
      combo.celebration = true;
    }
    updateComboHud();
  }

  function updateComboHud() {
    comboCountEl.textContent = `${combo.count} 連段 · 本局最高 ${combo.best}`;
    comboToast.classList.toggle("hidden", combo.notice <= 0);
  }

  function refreshTouchButtons() {
    Object.entries(touchButtons).forEach(([action, button]) => {
      button.classList.toggle("touch-held", Array.from(touchPointers.values()).includes(action));
      button.disabled = state !== STATE.PLAYING;
    });
  }

  function clearTouchInput() {
    touchPointers.clear();
    refreshTouchButtons();
  }

  function directionHeld(action) {
    return keys[action] || Array.from(touchPointers.values()).includes(action);
  }

  function getSmokePhase() {
    const difficulty = SMOKE_STAGES[scenery.index];
    const phase = gameTime % difficulty.cycle;
    const eruptDuration = difficulty.erupt + (eventState.type === "smog" ? 800 : 0);
    return phase < SMOKE_WARNING_MS ? "warning" : phase < SMOKE_WARNING_MS + eruptDuration ? "erupting" : "quiet";
  }

  function useSkill() {
    if (state !== STATE.PLAYING || ability.cooldown > 0) return;
    const skill = CHARACTERS[selectedCharacter];
    ability.remaining = skill.duration;
    ability.cooldown = skill.cooldown;
    if (selectedCharacter === "char19") {
      world.smokeParticles = world.smokeParticles.filter(p => Math.hypot(p.x - player.x - player.w / 2, p.y - player.y - player.h / 2) > 260);
      setEcoScore(world.ecoScore + 10);
    }
    updateAdventureHud();
  }

  function updateAdventureHud() {
    const skill = CHARACTERS[selectedCharacter];
    skillNameEl.textContent = `${skill.name} [${skill.key}]`;
    skillBtn.setAttribute("aria-keyshortcuts", `${skill.key} E`);
    skillStatusEl.textContent = ability.remaining > 0
      ? `生效中 · ${Math.ceil(ability.remaining / 1000)} 秒`
      : ability.cooldown > 0 ? `冷卻 · ${Math.ceil(ability.cooldown / 1000)} 秒` : touchDevice ? "點我 · 使用技能" : `按 ${skill.key} / E · 使用技能`;
    skillBtn.disabled = state !== STATE.PLAYING || ability.cooldown > 0;
    skillBtn.classList.toggle("skill-active", ability.remaining > 0);
    skillEffectEl.textContent = `${skill.description} · 冷卻 ${skill.cooldown / 1000} 秒`;
    const readyPercent = Math.round((1 - ability.cooldown / skill.cooldown) * 100);
    skillProgress.setAttribute("aria-valuenow", String(readyPercent));
    skillProgressFill.style.width = `${readyPercent}%`;
    openingHint.classList.toggle("hidden", state !== STATE.PLAYING || gameTime >= 3000);
    openingSkillHint.textContent = touchDevice ? `點技能欄 · ${skill.name}` : `${skill.key} / E · ${skill.name}`;
    refreshTouchButtons();
    const event = EVENTS[eventState.type];
    const scene = SCENES[scenery.index];
    const sceneNotice = scenery.notice > 0;
    eventCard.dataset.event = sceneNotice ? "scene" : eventState.type || "calm";
    const broadcastName = sceneNotice ? `冒險節奏加快！ · ${scene.name}` : event ? event.name : "🌿 平靜時刻";
    if (eventNameEl.textContent !== broadcastName) eventNameEl.textContent = broadcastName;
    eventDescriptionEl.textContent = event ? event.description : sceneNotice ? scene.hint : (eventState.lastType ? "趁現在清理垃圾，準備下一波冒險。" : "準備迎接清潔隊補給！");
    eventCountdownEl.textContent = sceneNotice ? `速度 +${scenery.index * 5}%` : event ? `剩餘 ${Math.ceil(eventState.remaining / 1000)} 秒` : `${Math.max(0, Math.ceil((eventState.nextAt - gameTime) / 1000))} 秒後事件`;
    sceneNameEl.textContent = scene.name;
    sceneHintEl.textContent = scene.hint + (world.score >= RAINBOW_SCORE ? " 🌈 彩虹已出現！" : ` 下一站：${SCENES[scenery.index + 1] ? SCENES[scenery.index + 1].threshold + " 分" : "2000 分終點"}`);
  }

  function updateScenery(dt) {
    const nextIndex = SCENES.reduce((index, scene, i) => world.score >= scene.threshold ? i : index, 0);
    if (nextIndex !== scenery.index) {
      scenery.previous = scenery.index;
      scenery.index = nextIndex;
      scenery.transition = 0;
      scenery.notice = 3500;
      // 只重建畫面外的前方物件，讓新場景使用自己的道具與障礙組合。
      const boundary = world.cameraX + WIDTH + 80;
      world.obstacles = world.obstacles.filter(o => o.x < boundary);
      world.trashes = world.trashes.filter(t => t.x < boundary);
      world.pickups = world.pickups.filter(p => p.x < boundary);
      world.lastGeneratedX = boundary;
      if (world.finishFlagX === null) generateMapSegment(player.x + 1200);
    }
    scenery.transition = Math.min(1200, scenery.transition + dt);
    const speedTarget = 1 + scenery.index * 0.05;
    const speedChange = 0.05 * dt / 1200;
    scenery.speedFactor += Math.max(-speedChange, Math.min(speedChange, speedTarget - scenery.speedFactor));
    scenery.notice = Math.max(0, scenery.notice - dt);
    if (world.score >= RAINBOW_SCORE) scenery.rainbow = Math.min(1, scenery.rainbow + dt / 1600);
  }

  function startEvent(type) {
    eventState.type = type;
    eventState.lastType = type;
    eventState.remaining = EVENTS[type].duration;
    if (type === "supply") {
      for (let i = 0; i < 4; i++) {
        world.pickups.push({ x: player.x + 150 + i * 85, y: GROUND_Y - 70, r: 24,
          type: "recycle", item: ["bottle", "can", "paper"][i % 3] });
      }
    }
  }

  function updateAdventure(dt) {
    ability.remaining = Math.max(0, ability.remaining - dt);
    ability.cooldown = Math.max(0, ability.cooldown - dt);
    if (eventState.type) {
      eventState.remaining = Math.max(0, eventState.remaining - dt);
      if (eventState.remaining === 0) {
        eventState.type = null;
        eventState.nextAt = gameTime + 14000 + Math.random() * 8000;
      }
    } else if (gameTime >= eventState.nextAt) {
      const options = Object.keys(EVENTS).filter(type => type !== eventState.lastType);
      startEvent(eventState.lastType === null ? "supply" : options[Math.floor(Math.random() * options.length)]);
    }
    if (selectedCharacter === "char18" && ability.remaining > 0) {
      const targetX = player.x + player.w / 2;
      const targetY = player.y + player.h / 2;
      const pull = Math.min(1, dt * 0.009);
      const attract = (item, offset) => {
        const dx = targetX - item.x - offset;
        const dy = targetY - item.y - offset;
        if (Math.hypot(dx, dy) <= 180) { item.x += dx * pull; item.y += dy * pull; }
      };
      world.trashes.forEach(t => { if (t.alive && t.type === "recyclable") attract(t, 12); });
      world.pickups.forEach(p => attract(p, 0));
    }
    updateAdventureHud();
  }

  function generateRiverObstacles(x) {
    const patterns = [
      [{ offset: 0, h: 48, w: 44 }, { offset: 620, h: 156, w: 52 }, { offset: 1240, h: 66, w: 48 }],
      [{ offset: 0, h: 64, w: 48 }, { offset: 650, h: 166, w: 56 }],
      [{ offset: 0, h: 152, w: 52 }, { offset: 650, h: 52, w: 44 }]
    ];
    // 第一組固定由低到高，後續再交替不同組合；組間留出落地空間。
    const pattern = scenery.riverGroups === 0 ? patterns[0] : patterns[Math.floor(Math.random() * patterns.length)];
    pattern.forEach(part => {
      world.obstacles.push({ x: x + part.offset, y: GROUND_Y - part.h, w: part.w,
        h: part.h, kind: "rock", color: "#95a8a2", hasCO2: false });
      if (part.h >= 170) world.pickups.push({ x: x + part.offset + part.w / 2,
        y: GROUND_Y - part.h - 42, r: 24, type: "recycle", item: "bottle" });
    });
    const last = pattern[pattern.length - 1];
    world.lastGeneratedX = x + last.offset + last.w + 120;
    scenery.riverGroups += 1;
  }

  // 💡 動態在地圖前方生成新的障礙物與道具
  function generateMapSegment(toX) {
    const scene = SCENES[scenery.index];
    while (world.lastGeneratedX < toX) {
      world.lastGeneratedX += scene.spacing + Math.random() * 180;
      const x = world.lastGeneratedX;
      const type = Math.random();

      if (scene.id === "river" && (scenery.riverGroups === 0 || type < 0.5)) {
        generateRiverObstacles(x);
        continue;
      }

      // 分數越高，煙囪出現的機率與密度可以動態調整
      if (type < scene.obstacleChance) {
        const h = 55 + Math.random() * 40;
        const kind = scene.obstacle === "chimney" || Math.random() < 0.25 ? "chimney" : scene.obstacle;
        world.obstacles.push({
          x: x,
          y: GROUND_Y - h,
          w: 44,
          h: h,
          kind,
          color: ["#ad8170", "#95a8a2", "#bbaa86"][Math.floor(Math.random() * 3)],
          hasCO2: kind === "chimney" && Math.random() < 0.7
        });
      } else if (type < 0.8) {
        const isRecycle = Math.random() < scene.recycleChance;
        world.trashes.push({
          x: x,
          y: GROUND_Y - 24,
          w: 24,
          h: 24,
          // 紅色編號固定扣生命，綠色編號固定加生命。
          type: isRecycle ? "recyclable" : "ordinary",
          imageId: isRecycle
            ? scene.safeItems[Math.floor(Math.random() * scene.safeItems.length)]
            : scene.dangerItems[Math.floor(Math.random() * scene.dangerItems.length)],
          alive: true
        });
      } else {
        world.pickups.push({
          x: x,
          y: GROUND_Y - 100 - Math.random() * 50,
          r: 24,
          type: "recycle",
          item: ["bottle", "can", "paper"][Math.floor(Math.random() * 3)]
        });
      }
    }
  }

  function resetWorld() {
    Object.assign(combo, { count: 0, best: 0, notice: 0, effect: 0, celebration: false });
    updateComboHud();
    world.cameraX = 0;
    world.ecoScore = 50;
    world.score = 0;
    world.lives = 3;
    world.lastGeneratedX = 400;
    world.finishFlagX = null;
    gameTime = 0;
    Object.assign(scenery, { index: 0, previous: 0, transition: 1200, rainbow: 0, riverGroups: 0, notice: 0, speedFactor: 1 });
    player.x = 100;
    player.y = GROUND_Y - player.h;
    player.vx = 0;
    player.vy = 0;
    player.jumpsLeft = 2;
    player.invincible = 0;
    player.knockbackRemaining = 0;
    player.knockbackVx = 0;
    player.animTimer = 0;
    keys.left = false;
    keys.right = false;
    clearTouchInput();
    ability.remaining = 0;
    ability.cooldown = 0;
    Object.assign(eventState, { type: null, remaining: 0, nextAt: 8000, lastType: null });
    world.obstacles = [];
    world.trashes = [];
    world.pickups = [];
    world.smokeParticles = [];

    // 初始化前方 1500px 的地圖
    generateMapSegment(1500);
    updateEcoVisuals();
    updateHud();
    updateAdventureHud();
  }

  function setEcoScore(next) {
    world.ecoScore = clamp(next, 0, 100);
    updateEcoVisuals();
  }

  function updateEcoVisuals() {
    const t = world.ecoScore / 100;
    const grayscale = (1 - t) * 22;
    const saturate = 0.8 + t * 0.3;
    const brightness = 0.9 + t * 0.1;
    canvas.style.filter = `grayscale(${grayscale}%) saturate(${saturate}) brightness(${brightness})`;

    ecoValueEl.textContent = Math.round(world.ecoScore);
    ecoBarFill.style.width = `${world.ecoScore}%`;
  }

  function updateHud() {
    scoreValueEl.textContent = Math.floor(world.score);
    livesValueEl.textContent = "♥".repeat(world.lives) + "♡".repeat(MAX_LIVES - world.lives);
    const remaining = Math.max(0, GAME_LIMIT_MS - gameTime);
    const totalSeconds = Math.ceil(remaining / 1000);
    timerValueEl.textContent = `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
  }

  function loadLeaderboard() {
    try { return JSON.parse(localStorage.getItem("ecoMarioLeaderboard") || "[]"); }
    catch { return []; }
  }

  function saveScore(score) {
    const scores = [...loadLeaderboard(), Math.floor(score)].sort((a, b) => b - a).slice(0, 5);
    localStorage.setItem("ecoMarioLeaderboard", JSON.stringify(scores));
    leaderboardList.innerHTML = scores.length
      ? scores.map((value, index) => `<li>第 ${index + 1} 名：<strong>${value}</strong> 分</li>`).join("")
      : "<li>目前尚無紀錄</li>";
  }

  function jump() {
    if (state !== STATE.PLAYING) return;
    if (player.jumpsLeft === 2) {
      player.vy = FIRST_JUMP_VELOCITY;
      player.jumpsLeft -= 1;
    } else if (player.jumpsLeft === 1) {
      player.vy = SECOND_JUMP_VELOCITY;
      player.jumpsLeft -= 1;
    }
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function drawRecycleItem(t) {
    ctx.save();
    ctx.translate(t.x + 12, t.y + 12);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#176b45";
    if (t.item === "can") {
      ctx.fillStyle = "#f2c94c";
      ctx.beginPath();
      ctx.roundRect(-8, -10, 16, 20, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2ecc71";
      ctx.fillRect(-6, -2, 12, 5);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px sans-serif";
      ctx.fillText("R", -3, 2);
    } else if (t.item === "paper") {
      ctx.fillStyle = "#fff4d6";
      ctx.beginPath();
      ctx.moveTo(-10, -9); ctx.lineTo(7, -9); ctx.lineTo(10, 8); ctx.lineTo(-7, 10); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#77a879";
      ctx.beginPath(); ctx.moveTo(-5, -3); ctx.lineTo(5, -4); ctx.moveTo(-4, 2); ctx.lineTo(6, 1); ctx.stroke();
    } else {
      ctx.fillStyle = "#72d4ed";
      ctx.beginPath();
      ctx.roundRect(-7, -10, 14, 20, 4);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px sans-serif";
      ctx.fillText("♻", -6, 3);
    }
    ctx.restore();
  }

  function drawOrdinaryItem(t) {
    ctx.save();
    ctx.translate(t.x + 12, t.y + 12);
    ctx.strokeStyle = "#b83227";
    ctx.lineWidth = 3;
    if (t.item === "tissue") {
      ctx.fillStyle = "#fff8ef";
      ctx.beginPath();
      ctx.moveTo(-20, -10); ctx.quadraticCurveTo(-8, -22, 2, -10);
      ctx.quadraticCurveTo(16, -22, 21, -5); ctx.lineTo(16, 18);
      ctx.quadraticCurveTo(0, 25, -17, 14); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#e5cdb8";
      ctx.beginPath(); ctx.moveTo(-9, -7); ctx.quadraticCurveTo(2, 1, 11, -5); ctx.stroke();
    } else if (t.item === "banana") {
      ctx.strokeStyle = "#b07a00";
      ctx.fillStyle = "#f6c744";
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0.25, Math.PI * 0.9);
      ctx.lineWidth = 10;
      ctx.stroke();
      ctx.strokeStyle = "#b07a00";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = "#f28c8c";
      ctx.beginPath(); ctx.arc(-3, 2, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff1dc";
      ctx.beginPath(); ctx.arc(4, 7, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#4d8b45";
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, -17); ctx.quadraticCurveTo(7, -27, 14, -20); ctx.stroke();
    }
    ctx.restore();
  }

  function drawRainbow(centerX, topY) {
    const colors = ["#ee9fae", "#f4be92", "#f5dfa0", "#a8dba1", "#9ed3e7", "#c5b8e4"];
    ctx.save();
    ctx.globalAlpha = scenery.rainbow * 0.7;
    ctx.shadowColor = "rgba(255, 255, 232, 0.5)";
    ctx.shadowBlur = 8;
    colors.forEach((color, index) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(centerX, topY + 100, 100 - index * 6, Math.PI, Math.PI * 2);
      ctx.stroke();
    });
    ctx.restore();
  }

  function hitPlayer(source = null, sourceX = player.x) {
    if (state !== STATE.PLAYING || player.invincible > 0 || (selectedCharacter === "char17" && ability.remaining > 0)) return;
    world.lives -= 1;
    if (combo.count > 0) {
      comboToast.textContent = `連段中斷，重新挑戰！本局最高 ${combo.best} 件`;
      combo.notice = 1800;
    }
    combo.count = 0;
    combo.effect = 0;
    updateComboHud();
    setEcoScore(world.ecoScore - 12);
    player.invincible = 1000;
    if (source === "smoke") {
      const center = player.x + player.w / 2;
      const direction = center === sourceX ? (player.facing === "right" ? -1 : 1) : Math.sign(center - sourceX);
      player.knockbackVx = direction * 3.4;
      player.knockbackRemaining = 180;
      player.vy = -5;
    }
    updateHud();
    if (world.lives <= 0) {
      endGame("生命值耗盡！");
    }
  }

  function endGame(reason) {
    if (state === STATE.GAMEOVER) return;
    state = STATE.GAMEOVER;
    clearTouchInput();
    keys.left = false;
    keys.right = false;
    updateAdventureHud();
    gameOverText.textContent = reason;
    finalScoreEl.textContent = Math.floor(world.score);
    saveScore(world.score);
    window.ecoMusic?.stop();
    gameOverOverlay.classList.remove("hidden");
    if (homeTimer) clearTimeout(homeTimer);
    if (reason === "時間到！") homeTimer = setTimeout(goToHome, 1800);
  }

  function startGame() {
    if (homeTimer) clearTimeout(homeTimer);
    enterPhoneFullscreen();
    rulesView.classList.add("hidden");
    document.body.classList.remove("rules-open");
    landingView.classList.add("hidden");
    gameView.classList.remove("hidden");
    resizeGameViewport();
    resetWorld();
    state = STATE.PLAYING;
    window.ecoMusic?.start(() => world.score);
    updateAdventureHud();
    gameOverOverlay.classList.add("hidden");
  }

  function goToHome() {
    if (homeTimer) clearTimeout(homeTimer);
    state = STATE.START;
    window.ecoMusic?.stop();
    clearTouchInput();
    keys.left = false;
    keys.right = false;
    updateAdventureHud();
    gameOverOverlay.classList.add("hidden");
    gameView.classList.add("hidden");
    landingView.classList.remove("hidden");
    window.scrollTo(0, 0);
  }

  function update(dt) {
    if (state !== STATE.PLAYING) return;
    combo.notice = Math.max(0, combo.notice - dt);
    combo.effect = Math.max(0, combo.effect - dt);
    updateComboHud();
    gameTime += dt;
    if (gameTime >= GAME_LIMIT_MS) {
      updateHud();
      endGame("時間到！");
      return;
    }
    updateScenery(dt);
    updateAdventure(dt);
    updateHud();

    let targetSpeed = 0;
    const stageSpeed = MOVE_SPEED * scenery.speedFactor;
    if (directionHeld("left")) { targetSpeed = -stageSpeed; player.facing = "left"; }
    else if (directionHeld("right")) { targetSpeed = stageSpeed; player.facing = "right"; }
    const braking = targetSpeed === 0 || targetSpeed * player.vx < 0;
    if (eventState.type === "wind") targetSpeed = Math.min(stageSpeed + 0.6, targetSpeed + 1.4);
    const speedStep = (braking ? 0.95 : 0.6) * dt / FRAME_MS;
    player.vx += Math.max(-speedStep, Math.min(speedStep, targetSpeed - player.vx));
    if (player.knockbackRemaining > 0) {
      player.vx = player.knockbackVx;
      player.knockbackRemaining = Math.max(0, player.knockbackRemaining - dt);
    }

    player.x += player.vx;
    player.x = Math.max(0, player.x); // 左邊不能超出 0，右邊可無限延伸

    // 💡 當玩家往前跑時，自動在前方 1200px 範圍持續生成地圖
    if (player.x + 1200 > world.lastGeneratedX && world.finishFlagX === null) {
      generateMapSegment(player.x + 1200);
    }

    // 💡 檢查是否達到目標高分，達到時在前方生成終點
    if (world.score >= WIN_SCORE && world.finishFlagX === null) {
      world.finishFlagX = player.x + 800; // 在前方 800px 處設置終點旗桿
    }

    // 💡 碰觸到終點旗桿通關
    if (world.finishFlagX !== null && player.x >= world.finishFlagX) {
      endGame(`恭喜高分通關！成功達到 ${WIN_SCORE} 分拯救地球！`);
      return;
    }

    player.vy += GRAVITY;
    player.y += player.vy;

    const isGrounded = player.y >= GROUND_Y - player.h;
    if (isGrounded) {
      player.y = GROUND_Y - player.h;
      player.vy = 0;
      player.jumpsLeft = 2;
    }

    if (isGrounded && player.vx !== 0) {
      player.animTimer += dt * 0.015;
    } else {
      player.animTimer = 0;
    }

    if (player.invincible > 0) player.invincible -= dt;

    world.cameraX = Math.max(0, player.x - Math.min(200, WIDTH * 0.28));

    const isErupting = getSmokePhase() === "erupting";

    world.obstacles.forEach((o) => {
      if (o.hasCO2 && o.x > world.cameraX - 80 && o.x < world.cameraX + WIDTH + 80 && isErupting && Math.random() < 0.3) {
        world.smokeParticles.push({
          x: o.x + o.w / 2 + (Math.random() * 10 - 5),
          y: o.y,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -2.8 - Math.random() * 1.5,
          r: 10 + Math.random() * 6,
          alpha: 0.85
        });
      }
    });

    world.smokeParticles.forEach((p) => {
      p.x += p.vx + (eventState.type === "wind" ? 1.8 : 0);
      p.y += p.vy;
      p.r += 0.25;
      p.alpha -= 0.012;
    });
    world.smokeParticles = world.smokeParticles.filter((p) => p.alpha > 0);

    const pRect = { x: player.x + 8, y: player.y + 8, w: player.w - 16, h: player.h - 16 };

    world.trashes.forEach((t) => {
      if (!t.alive || state !== STATE.PLAYING) return;
      if (rectsOverlap(pRect, t)) {
        t.alive = false;
        if (t.type === "recyclable") {
          world.score += 40;
          collectCombo();
          setEcoScore(world.ecoScore + 4);
          world.lives = Math.min(MAX_LIVES, world.lives + 1);
          player.vy = FIRST_JUMP_VELOCITY * 0.65;
        } else {
          hitPlayer();
        }
        updateHud();
      }
    });

    world.obstacles.forEach((o) => {
      if (state === STATE.PLAYING && rectsOverlap(pRect, o)) hitPlayer();
    });
    if (state !== STATE.PLAYING) return;

    world.smokeParticles.forEach((p) => {
      const dx = (player.x + player.w/2) - p.x;
      const dy = (player.y + player.h/2) - p.y;
      if (Math.sqrt(dx*dx + dy*dy) < p.r + 15 && player.invincible <= 0 && !(selectedCharacter === "char17" && ability.remaining > 0)) {
        hitPlayer("smoke", p.x);
      }
    });
    if (state !== STATE.PLAYING) return;

    world.pickups = world.pickups.filter((p) => {
      const dx = (player.x + player.w/2) - p.x;
      const dy = (player.y + player.h/2) - p.y;
      if (Math.sqrt(dx*dx + dy*dy) < p.r + 20) {
        setEcoScore(world.ecoScore + 6);
        world.score += 20;
        collectCombo();
        updateHud();
        return false;
      }
      return true;
    });

    // 💡 效能優化：清除鏡頭左側太遠的舊物件
    const cleanupX = world.cameraX - 400;
    world.obstacles = world.obstacles.filter(o => o.x > cleanupX);
    world.trashes = world.trashes.filter(t => t.x > cleanupX);
    world.pickups = world.pickups.filter(p => p.x > cleanupX);
  }

 // 💡 繪製角色（瑪利歐風格的自然跑步律動）
 function drawPlayer() {
  if (player.invincible > 0 && Math.floor(player.invincible / 80) % 2 === 0) return;

  ctx.save();
  let offsetY = 0;
  let rotation = 0;
  let girlRunPhase = 0;

  if (player.vy !== 0) {
    // 空中跳躍：身體微往前傾斜，高度固定
    rotation = 0.08;
    offsetY = -2;
  } else if (player.vx !== 0) {
    const isTwinTailGirl = selectedCharacter === "char18";
    const runPhase = gameTime * (isTwinTailGirl ? 0.022 : 0.012);
    offsetY = -Math.abs(Math.sin(runPhase)) * (isTwinTailGirl ? 9 : 5);
    rotation = Math.sin(gameTime * (isTwinTailGirl ? 0.022 : 0.006)) * (isTwinTailGirl ? 0.08 : 0.03);
    if (isTwinTailGirl) {
      girlRunPhase = runPhase;
      // 女孩跑步時身體持續朝前傾，並隨步伐上下彈動。
      rotation += player.facing === "right" ? -0.13 : 0.13;
    }
  }

  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2 + offsetY;
  ctx.translate(cx, cy);

  const shouldFlip = player.facing === "left";
  if (shouldFlip) {
    ctx.scale(-1, 1);
  }
  if (selectedCharacter === "char18" && player.vx !== 0 && player.vy === 0) {
    const stride = Math.sin(girlRunPhase);
    ctx.transform(1, 0, player.facing === "right" ? -0.2 : 0.2, 1, 0, 0);
    ctx.scale(1 + Math.abs(stride) * 0.035, 1 - Math.abs(stride) * 0.045);
  }
  ctx.rotate(rotation);

  const currentImg = charImages[selectedCharacter];
  if (currentImg && currentImg.complete && currentImg.naturalWidth !== 0) {
    const crop = charCrop[selectedCharacter];
    if (crop) {
      // 維持原本 240x240 的角色尺寸，只裁掉右側白線所在的區域。
      ctx.save();
      ctx.beginPath();
      ctx.rect(-120, -120, 132, 240);
      ctx.clip();
      ctx.drawImage(currentImg, -120, -120 + 8, 240, 240);
      ctx.restore();
    } else {
      ctx.drawImage(currentImg, -120, -120 + 8, 240, 240);
    }
  } else {
    ctx.fillStyle = "#FFC0CB";
    ctx.fillRect(-player.w / 2, -player.h / 2, player.w, player.h);
  }

  ctx.restore();
}

  function drawScene(scene, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const img = scene.image;
    if (img.complete && img.naturalWidth > 0) {
      const sourceGround = Math.round(img.naturalHeight * scene.surface);
      const sourceWidth = img.naturalWidth * Math.min(1, WIDTH / 800);
      const sourceLeft = (img.naturalWidth - sourceWidth) / 2;
      // 對齊每張圖片的地面與碰撞地板，避免角色腳下漂浮或陷入背景。
      ctx.drawImage(img, sourceLeft, 0, sourceWidth, sourceGround, world.cameraX, 0, WIDTH, GROUND_Y);
      ctx.drawImage(img, sourceLeft, sourceGround, sourceWidth, img.naturalHeight - sourceGround, world.cameraX, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);
    } else {
      ctx.fillStyle = "#c9e9e5";
      ctx.fillRect(world.cameraX, 0, WIDTH, GROUND_Y);
      ctx.fillStyle = scene.soil;
      ctx.fillRect(world.cameraX, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);
    }
    ctx.restore();
  }

  function drawGroundShadow(x, y, width, color = "#415540") {
    ctx.save();
    ctx.globalAlpha = Math.max(0.04, 0.19 - Math.abs(GROUND_Y - y) / 1400);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(x, GROUND_Y + 2, width, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawObstacle(o) {
    drawGroundShadow(o.x + o.w / 2, GROUND_Y, o.w * 0.6);
    ctx.save();
    ctx.lineWidth = 2;
    if (o.kind === "rock") {
      const stone = ctx.createLinearGradient(o.x, o.y, o.x + o.w, GROUND_Y);
      stone.addColorStop(0, "#bdc8bd"); stone.addColorStop(1, "#7f9487");
      ctx.fillStyle = stone; ctx.strokeStyle = "#697e72";
      ctx.beginPath(); ctx.moveTo(o.x, GROUND_Y); ctx.lineTo(o.x + 2, o.y + o.h * 0.35);
      ctx.quadraticCurveTo(o.x + o.w * 0.4, o.y - 2, o.x + o.w * 0.7, o.y + 5);
      ctx.lineTo(o.x + o.w, GROUND_Y); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,239,0.6)";
      ctx.beginPath(); ctx.moveTo(o.x + 9, o.y + o.h * 0.4); ctx.lineTo(o.x + o.w * 0.55, o.y + 12); ctx.stroke();
    } else if (o.kind === "stump") {
      ctx.fillStyle = "#a07953"; ctx.strokeStyle = "#71543d";
      ctx.beginPath(); ctx.roundRect(o.x, o.y + 5, o.w, o.h - 5, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#dfc898";
      ctx.beginPath(); ctx.ellipse(o.x + o.w / 2, o.y + 7, o.w / 2, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(o.x + o.w / 2, o.y + 7, o.w / 3, 3, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "#846140";
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(o.x + i * 11, o.y + 20); ctx.lineTo(o.x + i * 10, GROUND_Y - 7); ctx.stroke(); }
    } else {
      const masonry = ctx.createLinearGradient(o.x, 0, o.x + o.w, 0);
      masonry.addColorStop(0, o.color); masonry.addColorStop(0.5, "#d0bfa6"); masonry.addColorStop(1, o.color);
      ctx.fillStyle = masonry; ctx.strokeStyle = "#766d61";
      ctx.beginPath(); ctx.roundRect(o.x, o.y, o.w, o.h, 4); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(91,79,67,0.25)";
      for (let y = o.y + 20; y < GROUND_Y; y += 18) { ctx.beginPath(); ctx.moveTo(o.x + 2, y); ctx.lineTo(o.x + o.w - 2, y); ctx.stroke(); }
      ctx.fillStyle = "#706e65"; ctx.beginPath(); ctx.roundRect(o.x - 2, o.y, o.w + 4, 8, 3); ctx.fill();
      if (o.hasCO2) {
        const phase = getSmokePhase();
        ctx.fillStyle = phase === "warning" ? (Math.floor(gameTime / 150) % 2 ? "#ffd36a" : "#c69540") : phase === "erupting" ? "#d57967" : "#adc5a0";
        ctx.beginPath(); ctx.arc(o.x + o.w / 2, o.y + 17, 4, 0, Math.PI * 2); ctx.fill();
        if (phase === "warning") {
          ctx.fillStyle = "#fff5d9";
          ctx.beginPath(); ctx.roundRect(o.x + o.w / 2 - 35, o.y - 23, 70, 18, 6); ctx.fill();
          ctx.fillStyle = "#8b5e24"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center";
          ctx.fillText("即將噴氣！", o.x + o.w / 2, o.y - 10);
        }
      }
    }
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.save();
    ctx.translate(-world.cameraX, 0);

    const scene = SCENES[scenery.index];
    if (scenery.transition < 1200) {
      drawScene(SCENES[scenery.previous]);
      drawScene(scene, scenery.transition / 1200);
    } else drawScene(scene);
    if (scenery.rainbow > 0) drawRainbow(world.cameraX + WIDTH * scene.rainbowX, 98);

    // 小幅地面紋理隨鏡頭移動，背景保持開闊的天空供彩虹呈現。
    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = scene.ground;
    for (let x = Math.floor(world.cameraX / 75) * 75; x < world.cameraX + WIDTH; x += 75) {
      ctx.beginPath(); ctx.ellipse(x + 30, GROUND_Y + 14, 9, 2, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // 💡 當達到設定高分時，才繪製終點旗桿
    if (world.finishFlagX !== null) {
      ctx.fillStyle = "#E74C3C";
      ctx.fillRect(world.finishFlagX, GROUND_Y - 140, 10, 140);
      ctx.beginPath();
      ctx.moveTo(world.finishFlagX + 10, GROUND_Y - 140);
      ctx.lineTo(world.finishFlagX + 60, GROUND_Y - 115);
      ctx.lineTo(world.finishFlagX + 10, GROUND_Y - 90);
      ctx.closePath();
      ctx.fill();
    }

    world.obstacles.forEach(drawObstacle);

    world.smokeParticles.forEach((p) => {
      ctx.fillStyle = `rgba(80, 80, 80, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.8})`;
      ctx.font = "bold 9px sans-serif";
      ctx.fillText("CO₂", p.x - 8, p.y + 3);
    });

    world.trashes.forEach((t) => {
      if (!t.alive) return;
      const img = itemImages[t.imageId];
      if (!img || !img.complete || img.naturalWidth === 0) return;
      drawGroundShadow(t.x + 12, t.y + 24, 18, t.type === "recyclable" ? "#3b7452" : "#96554c");
      ctx.save(); ctx.shadowColor = "rgba(65,64,42,0.22)"; ctx.shadowBlur = 3; ctx.shadowOffsetY = 2;
      if (t.imageId === 22) {
        // 22.png 右側有白線，只繪製透明圖案所在區域。
        ctx.drawImage(img, 0, 0, img.naturalWidth * 0.82, img.naturalHeight, t.x - 10, t.y - 20, 44, 44);
      } else {
        ctx.drawImage(img, t.x - 10, t.y - 20, 44, 44);
      }
      ctx.restore();
    });

    world.pickups.forEach((p) => {
      drawGroundShadow(p.x, p.y, 15);
        const recycleImageId = { bottle: 26, can: 27, paper: 25 }[p.item];
        const img = itemImages[recycleImageId];
        if (img && img.complete && img.naturalWidth !== 0) {
          ctx.drawImage(img, p.x - 28, p.y - 28, 56, 56);
        }
    });

    drawGroundShadow(player.x + player.w / 2, player.y + player.h, 23);
    drawPlayer();

    if (combo.effect > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, combo.effect / 450);
      const pieces = combo.celebration ? 18 : 8;
      for (let i = 0; i < pieces; i++) {
        const angle = i * Math.PI * 2 / pieces + gameTime * 0.002;
        const radius = combo.celebration ? 70 + Math.sin(i + gameTime * 0.004) * 18 : 55;
        ctx.fillStyle = combo.celebration ? ["#95c97a", "#f0ca77", "#eea8bb", "#9dd0df"][i % 4] : "#98c980";
        ctx.beginPath();
        ctx.ellipse(player.x + player.w / 2 + Math.cos(angle) * radius,
          player.y + player.h / 2 + Math.sin(angle) * radius * 0.65, 5, 2.5, angle, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (ability.remaining > 0) {
      const skill = CHARACTERS[selectedCharacter];
      const centerX = player.x + player.w / 2;
      const centerY = player.y + player.h / 2;
      const radius = selectedCharacter === "char17" ? 55 : selectedCharacter === "char18" ? 180 : 35 + (1 - ability.remaining / skill.duration) * 225;
      ctx.save();
      ctx.strokeStyle = skill.color;
      ctx.fillStyle = skill.color;
      ctx.globalAlpha = 0.12;
      ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = selectedCharacter === "char19" ? ability.remaining / skill.duration : 0.75;
      ctx.lineWidth = 3;
      if (selectedCharacter === "char18") ctx.setLineDash([8, 8]);
      ctx.stroke();
      ctx.restore();
    }

    if (eventState.type === "smog") {
      ctx.fillStyle = "rgba(190, 195, 186, 0.16)";
      ctx.fillRect(world.cameraX, 0, WIDTH, GROUND_Y);
    } else if (eventState.type === "wind") {
      ctx.strokeStyle = "rgba(220, 255, 231, 0.6)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        const x = world.cameraX + ((gameTime * 0.2 + i * 89) % (WIDTH + 80)) - 40;
        const y = 135 + (i * 37 % 160);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 34, y - 3); ctx.stroke();
      }
    }

    ctx.restore();
  }

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min(100, timestamp - lastTime);
    lastTime = timestamp;
    simulationRemainder += dt;
    while (simulationRemainder >= FRAME_MS) {
      update(FRAME_MS);
      simulationRemainder -= FRAME_MS;
    }
    draw();
    requestAnimationFrame(loop);
  }

  window.addEventListener("keydown", (e) => {
    if (!rulesView.classList.contains("hidden")) {
      if (e.code === "Escape") {
        e.preventDefault();
        backToHomeBtn.click();
      }
      return;
    }
    if (state !== STATE.PLAYING) return;
    const skillKey = CHARACTERS[selectedCharacter].key;
    const isSkillKey = e.code === "KeyE" || e.code === `Digit${skillKey}` || e.code === `Numpad${skillKey}`;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(e.code) || isSkillKey) e.preventDefault();
    if (isSkillKey && !e.repeat) useSkill();
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      e.preventDefault();
      if (!e.repeat) jump();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
  });

  if (enterGameBtn) enterGameBtn.addEventListener("click", startGame);
  const quickRestartBtn = document.getElementById("quickRestartBtn");
  quickRestartBtn.addEventListener("click", goToHome);
  quickRestartBtn.addEventListener("pointerup", (e) => {
    if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
    e.preventDefault();
    goToHome();
  });
  if (restartBtn) restartBtn.addEventListener("click", goToHome);
  skillBtn.addEventListener("click", useSkill);
  skillBtn.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch" || e.pointerType === "pen") {
      e.preventDefault();
      useSkill();
    }
  });
  Object.entries(touchButtons).forEach(([action, button]) => {
    button.addEventListener("pointerdown", (e) => {
      if (state !== STATE.PLAYING || (e.pointerType === "mouse" && e.button !== 0)) return;
      e.preventDefault();
      button.setPointerCapture(e.pointerId);
      touchPointers.set(e.pointerId, action);
      if (action === "jump") jump();
      refreshTouchButtons();
    });
    const release = (e) => {
      touchPointers.delete(e.pointerId);
      refreshTouchButtons();
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    button.addEventListener("contextmenu", e => e.preventDefault());
    button.addEventListener("click", e => { if (action === "jump" && e.detail === 0) jump(); });
  });
  if (touchDevice) {
    landingView.addEventListener("pointerdown", () => {
      if (state === STATE.START) {
        window.ecoMusic?.unlock();
        enterPhoneFullscreen();
      }
    }, { capture: true });
    document.querySelector(".opening-hint strong").textContent = "按住 ◀ ▶ 移動";
    document.querySelector(".opening-hint span").textContent = "點跳躍 · 空中再點一次二段跳";
    document.querySelector(".home-quick-tip").textContent = "手機支援觸控移動、二段跳與技能 · 建議橫向遊玩";
  }
  openRulesBtn.addEventListener("click", () => {
    enterPhoneFullscreen();
    landingView.classList.add("hidden");
    rulesView.classList.remove("hidden");
    document.body.classList.add("rules-open");
    document.getElementById("rulesTitle").focus();
  });
  backToHomeBtn.addEventListener("click", () => {
    rulesView.classList.add("hidden");
    document.body.classList.remove("rules-open");
    landingView.classList.remove("hidden");
    openRulesBtn.focus();
  });
  const releaseInputs = () => { keys.left = false; keys.right = false; clearTouchInput(); };
  window.addEventListener("blur", releaseInputs);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      releaseInputs();
      window.ecoMusic?.stop();
    } else if (state === STATE.PLAYING) window.ecoMusic?.start(() => world.score);
  });

  musicToggleButtons.forEach((button) => {
    const refresh = () => {
      const enabled = window.ecoMusic?.enabled !== false;
      button.textContent = enabled ? "♫ 音樂：開" : "♫ 音樂：關";
      button.setAttribute("aria-pressed", String(enabled));
      button.setAttribute("aria-label", enabled ? "關閉背景音樂" : "開啟背景音樂");
    };
    button.addEventListener("click", () => {
      const enabled = window.ecoMusic?.setEnabled(!window.ecoMusic.enabled) ?? false;
      if (enabled && state === STATE.PLAYING) window.ecoMusic.start(() => world.score);
      musicToggleButtons.forEach((toggle) => {
        toggle.textContent = enabled ? "♫ 音樂：開" : "♫ 音樂：關";
        toggle.setAttribute("aria-pressed", String(enabled));
        toggle.setAttribute("aria-label", enabled ? "關閉背景音樂" : "開啟背景音樂");
      });
    });
    refresh();
  });

  function resizeGameViewport() {
    if (gameView.classList.contains("hidden")) return;
    const bounds = canvas.getBoundingClientRect();
    WIDTH = Math.max(180, Math.round(HEIGHT * bounds.width / Math.max(1, bounds.height)));
    canvas.width = WIDTH;
    world.cameraX = Math.max(0, player.x - Math.min(200, WIDTH * 0.28));
  }
  new ResizeObserver(resizeGameViewport).observe(canvas);
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  fullscreenBtn.hidden = !gameView.requestFullscreen;
  fullscreenBtn.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { fullscreenBtn.textContent = "目前使用滿版畫面"; }
  });
  document.addEventListener("fullscreenchange", () => {
    fullscreenBtn.textContent = document.fullscreenElement ? "⛶ 離開全螢幕" : "⛶ 全螢幕";
  });
  resetWorld();
  requestAnimationFrame(loop);
})();
