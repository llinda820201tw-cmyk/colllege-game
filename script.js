(() => {
  const landingView = document.getElementById("landingView");
  const gameView = document.getElementById("gameView");
  const enterGameBtn = document.getElementById("enterGameBtn");

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const WIDTH = 800;
  const HEIGHT = 400;
  const GROUND_Y = 340;

  // 💡 設定高分通關目標（可自行調整，例如 2000 分才能看到終點）
  const WIN_SCORE = 2000;
  const RAINBOW_SCORE = 1000;
  const GAME_LIMIT_MS = 10 * 60 * 1000;

  const stage = document.getElementById("gameStage");
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
  const MOVE_SPEED = 4.8;
  const MAX_LIVES = 5;

  let selectedCharacter = "char17";

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
  const rainbowImage = new Image();
  rainbowImage.src = "32.png";

  const CHIMNEY_COLORS = [
    "#E74C3C", "#E67E22", "#F1C40F", "#2ECC71", 
    "#3498DB", "#ECF0F1", "#9B59B6", "#2C3E50"
  ];

  const STATE = { START: "start", PLAYING: "playing", GAMEOVER: "gameover" };

  let state = STATE.START;
  let lastTime = 0;
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
      charBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedCharacter = btn.getAttribute("data-char");
    });
  });

  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

  // 💡 動態在地圖前方生成新的障礙物與道具
  function generateMapSegment(toX) {
    while (world.lastGeneratedX < toX) {
      world.lastGeneratedX += 220 + Math.random() * 180;
      const x = world.lastGeneratedX;
      const type = Math.random();

      // 分數越高，煙囪出現的機率與密度可以動態調整
      if (type < 0.5) {
        const h = 55 + Math.random() * 40;
        world.obstacles.push({
          x: x,
          y: GROUND_Y - h,
          w: 44,
          h: h,
          color: CHIMNEY_COLORS[Math.floor(Math.random() * CHIMNEY_COLORS.length)],
          hasCO2: Math.random() < 0.7
        });
      } else if (type < 0.8) {
        const isRecycle = Math.random() < 0.7;
        world.trashes.push({
          x: x,
          y: GROUND_Y - 24,
          w: 24,
          h: 24,
          // 紅色編號固定扣生命，綠色編號固定加生命。
          type: isRecycle ? "recyclable" : "ordinary",
          imageId: isRecycle
            ? [25, 26, 27][Math.floor(Math.random() * 3)]
            : [21, 22, 23, 28][Math.floor(Math.random() * 4)],
          alive: true
        });
      } else {
        world.pickups.push({
          x: x,
          y: GROUND_Y - 100 - Math.random() * 50,
          r: 30,
          type: Math.random() < 0.35 ? "thermos" : "recycle",
          item: ["bottle", "can", "paper"][Math.floor(Math.random() * 3)]
        });
      }
    }
  }

  function resetWorld() {
    world.cameraX = 0;
    world.ecoScore = 50;
    world.score = 0;
    world.lives = 3;
    world.lastGeneratedX = 400;
    world.finishFlagX = null;
    gameTime = 0;
    player.x = 100;
    player.y = GROUND_Y - player.h;
    player.vx = 0;
    player.vy = 0;
    player.jumpsLeft = 2;
    player.invincible = 0;
    player.animTimer = 0;
    world.obstacles = [];
    world.trashes = [];
    world.pickups = [];
    world.smokeParticles = [];

    // 初始化前方 1500px 的地圖
    generateMapSegment(1500);
    updateEcoVisuals();
    updateHud();
  }

  function setEcoScore(next) {
    world.ecoScore = clamp(next, 0, 100);
    updateEcoVisuals();
  }

  function updateEcoVisuals() {
    const t = world.ecoScore / 100;
    const grayscale = (1 - t) * (1 - t) * 100;
    const saturate = 0.45 + t * 1.05;
    const brightness = 0.68 + t * 0.42;
    stage.style.filter = `grayscale(${grayscale}%) saturate(${saturate}) brightness(${brightness})`;

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
    const colors = ["#ef476f", "#f78c6b", "#ffd166", "#06d6a0", "#118ab2", "#7b61ff"];
    colors.forEach((color, index) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(centerX, topY + 55, 105 - index * 9, Math.PI, Math.PI * 2);
      ctx.stroke();
    });
  }

  function hitPlayer() {
    if (player.invincible > 0) return;
    world.lives -= 1;
    setEcoScore(world.ecoScore - 12);
    player.invincible = 1000;
    updateHud();
    if (world.lives <= 0) {
      endGame("生命值耗盡！");
    }
  }

  function endGame(reason) {
    if (state === STATE.GAMEOVER) return;
    state = STATE.GAMEOVER;
    gameOverText.textContent = reason;
    finalScoreEl.textContent = Math.floor(world.score);
    saveScore(world.score);
    gameOverOverlay.classList.remove("hidden");
    if (homeTimer) clearTimeout(homeTimer);
    if (reason === "時間到！") homeTimer = setTimeout(goToHome, 1800);
  }

  function startGame() {
    landingView.classList.add("hidden");
    gameView.classList.remove("hidden");
    resetWorld();
    state = STATE.PLAYING;
    gameOverOverlay.classList.add("hidden");
  }

  function goToHome() {
    if (homeTimer) clearTimeout(homeTimer);
    state = STATE.START;
    gameOverOverlay.classList.add("hidden");
    gameView.classList.add("hidden");
    landingView.classList.remove("hidden");
  }

  function update(dt) {
    if (state !== STATE.PLAYING) return;
    gameTime += dt;
    if (gameTime >= GAME_LIMIT_MS) {
      updateHud();
      endGame("時間到！");
      return;
    }

    if (keys.left) { player.vx = -MOVE_SPEED; player.facing = "left"; }
    else if (keys.right) { player.vx = MOVE_SPEED; player.facing = "right"; }
    else { player.vx = 0; }

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

    world.cameraX = Math.max(0, player.x - 200);

    const cycleTime = gameTime % 4000;
    const isErupting = cycleTime < 1000;

    world.obstacles.forEach((o) => {
      if (o.hasCO2 && isErupting && Math.random() < 0.3) {
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
      p.x += p.vx;
      p.y += p.vy;
      p.r += 0.25;
      p.alpha -= 0.012;
    });
    world.smokeParticles = world.smokeParticles.filter((p) => p.alpha > 0);

    const pRect = { x: player.x + 8, y: player.y + 8, w: player.w - 16, h: player.h - 16 };

    world.trashes.forEach((t) => {
      if (!t.alive) return;
      if (rectsOverlap(pRect, t)) {
        t.alive = false;
        if (t.type === "recyclable") {
          world.score += 40;
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
      if (rectsOverlap(pRect, o)) hitPlayer();
    });

    world.smokeParticles.forEach((p) => {
      const dx = (player.x + player.w/2) - p.x;
      const dy = (player.y + player.h/2) - p.y;
      if (Math.sqrt(dx*dx + dy*dy) < p.r + 15 && player.invincible <= 0) {
        endGame("不幸吸入 CO2 廢氣窒息！");
      }
    });

    world.pickups = world.pickups.filter((p) => {
      const dx = (player.x + player.w/2) - p.x;
      const dy = (player.y + player.h/2) - p.y;
      if (Math.sqrt(dx*dx + dy*dy) < p.r + 20) {
        if (p.type === "thermos") {
          world.lives = MAX_LIVES;
          world.score += 50;
        } else {
          setEcoScore(world.ecoScore + 6);
          world.score += 20;
        }
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

  if (player.vy !== 0) {
    // 空中跳躍：身體微往前傾斜，高度固定
    rotation = 0.08;
    offsetY = -2;
  } else if (player.vx !== 0) {
    // 地面跑步：採用規律的踏步微彈效果（降低頻率與大幅縮小旋轉）
    offsetY = -Math.abs(Math.sin(gameTime * 0.012)) * 5; 
    rotation = Math.sin(gameTime * 0.006) * 0.03;
  }

  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2 + offsetY;
  ctx.translate(cx, cy);

  if (player.facing === "left") {
    ctx.scale(-1, 1);
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

  function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.save();
    ctx.translate(-world.cameraX, 0);

    const cleanProgress = clamp(world.score / RAINBOW_SCORE, 0, 1);
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, `rgb(${Math.round(30 + cleanProgress * 95)}, ${Math.round(42 + cleanProgress * 145)}, ${Math.round(62 + cleanProgress * 175)})`);
    sky.addColorStop(1, `rgb(${Math.round(74 + cleanProgress * 92)}, ${Math.round(82 + cleanProgress * 125)}, ${Math.round(88 + cleanProgress * 100)})`);
    ctx.fillStyle = sky;
    ctx.fillRect(world.cameraX, 0, WIDTH, HEIGHT);

    if (world.score >= RAINBOW_SCORE) {
      if (rainbowImage.complete && rainbowImage.naturalWidth !== 0) {
        ctx.drawImage(rainbowImage, world.cameraX + WIDTH / 2 - 125, 45, 250, 170);
      }
    }

    // 💡 地面隨鏡頭位置無限動態繪製
    ctx.fillStyle = "#556B2F";
    ctx.fillRect(world.cameraX, GROUND_Y, WIDTH + 200, HEIGHT - GROUND_Y);

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

    world.obstacles.forEach((o) => {
      ctx.fillStyle = o.color;
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = "#1A252F";
      ctx.lineWidth = 2;
      ctx.strokeRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = "#2C3E50";
      ctx.fillRect(o.x - 2, o.y, o.w + 4, 8);
    });

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
      if (t.imageId === 22) {
        // 22.png 右側有白線，只繪製透明圖案所在區域。
        ctx.drawImage(img, 0, 0, img.naturalWidth * 0.82, img.naturalHeight, t.x - 36, t.y - 36, 72, 72);
      } else {
        ctx.drawImage(img, t.x - 36, t.y - 36, 72, 72);
      }
    });

    world.pickups.forEach((p) => {
      if (p.type === "thermos") {
        ctx.fillStyle = "#3498DB";
        ctx.beginPath();
        ctx.roundRect(p.x - 18, p.y - 30, 36, 60, 9);
        ctx.fill();
        ctx.strokeStyle = "#145a86";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = "#dff6ff";
        ctx.fillRect(p.x - 11, p.y - 9, 22, 18);
        ctx.fillStyle = "#E74C3C";
        ctx.font = "bold 15px sans-serif";
        ctx.fillText("♥♥", p.x - 13, p.y + 5);
      } else {
        const recycleImageId = { bottle: 26, can: 27, paper: 25 }[p.item];
        const img = itemImages[recycleImageId];
        if (img && img.complete && img.naturalWidth !== 0) {
          ctx.drawImage(img, p.x - 36, p.y - 36, 72, 72);
        }
      }
    });

    drawPlayer();

    ctx.restore();
  }

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min(32, timestamp - lastTime);
    lastTime = timestamp;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  window.addEventListener("keydown", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      e.preventDefault();
      jump();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
  });

  if (enterGameBtn) enterGameBtn.addEventListener("click", startGame);
  if (restartBtn) restartBtn.addEventListener("click", goToHome);

  resetWorld();
  requestAnimationFrame(loop);
})();
