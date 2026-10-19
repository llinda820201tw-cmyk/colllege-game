/* Only the packaged Android app and iPhone use this adapter. */
(() => {
  const androidApp = location.hostname === "appassets.androidplatform.net";
  const iphone = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!androidApp && !iphone) return;
  const root = document.documentElement;
  root.classList.add("mobile-display");
  if (iphone) root.classList.add("ios-display");
  const game = document.getElementById("gameView");
  const button = document.getElementById("fullscreenBtn");
  const standalone = () => navigator.standalone === true || matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches;
  const sync = () => {
    root.classList.toggle("mobile-playing", !game.classList.contains("hidden"));
    // The Activity already owns Android's immersive mode. Never request a
    // second, unsupported WebView custom fullscreen surface.
    button.hidden = androidApp || standalone();
    if (iphone) button.textContent = "⛶ 加入主畫面全螢幕";
  };
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (iphone && !standalone()) {
      window.alert("若從 LINE 開啟，請先選「在 Safari 中開啟」。iPhone 請在 Safari 點選分享 → 加入主畫面，再從主畫面圖示開啟遊戲。若看到「以網頁 App 打開」，請開啟此選項。一般瀏覽分頁的按鈕無法保證隱藏 Safari 工具列。橫向遊玩可獲得較寬的視野。");
    }
  }, true);
  // visualViewport follows Safari's changing toolbar and rotation without
  // rotating the body or mixing physical and transformed canvas dimensions.
  const viewport = () => {
    root.style.setProperty("--mobile-height", `${window.visualViewport?.height || innerHeight}px`);
    root.style.setProperty("--mobile-width", `${window.visualViewport?.width || innerWidth}px`);
  };
  new MutationObserver(sync).observe(game, { attributes: true, attributeFilter: ["class"] });
  window.addEventListener("resize", viewport);
  window.visualViewport?.addEventListener("resize", viewport);
  window.addEventListener("pageshow", () => { viewport(); sync(); });
  if (iphone) {
    const subtitle = document.querySelector("#landingView .subtitle");
    subtitle.textContent = /Line\//i.test(navigator.userAgent)
      ? "LINE 內開啟：請改用 Safari，再加入主畫面以全螢幕遊玩。"
      : "點選角色啟動音樂 · 全螢幕：Safari 分享 → 加入主畫面";
    // Safari must receive resume/start directly from a user tap. The original
    // homepage only unlocked a muted context; music started only in the game.
    document.addEventListener("touchend", () => window.ecoMusic?.unlock(), { capture: true, passive: true });
    document.addEventListener("click", (event) => {
      const music = window.ecoMusic;
      if (!music) return;
      if (!music.enabled) return;
      music.unlock();
      const home = !document.getElementById("landingView").classList.contains("hidden");
      const playing = !game.classList.contains("hidden") && document.getElementById("gameOverOverlay").classList.contains("hidden");
      if (home || playing) music.start(() => Number(document.getElementById("scoreValue").textContent) || 0);
    });
    window.visualViewport?.addEventListener("scroll", viewport);
    document.addEventListener("visibilitychange", viewport);
    window.addEventListener("orientationchange", () => {
      viewport();
      requestAnimationFrame(viewport);
      setTimeout(viewport, 250);
    });
  }
  viewport();
  sync();
})();
