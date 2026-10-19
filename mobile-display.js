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
  const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  const nativeFullscreen = () => {
    if (document.fullscreenEnabled === true && document.documentElement.requestFullscreen) return document.documentElement.requestFullscreen;
    if (document.webkitFullscreenEnabled === true && document.documentElement.webkitRequestFullscreen) return document.documentElement.webkitRequestFullscreen;
    return null;
  };
  let guide = null;
  const showGuide = () => {
    if (!guide) {
      guide = document.createElement("dialog");
      guide.className = "ios-fullscreen-guide";
      guide.setAttribute("aria-labelledby", "iosFullscreenTitle");
      const title = document.createElement("h2");
      title.id = "iosFullscreenTitle";
      title.textContent = "iPhone 全螢幕開啟方式";
      const intro = document.createElement("p");
      intro.textContent = "目前在瀏覽器分頁中，遊戲會填滿可視區域，但網頁無法強制隱藏瀏覽器工具列。";
      const steps = document.createElement("ol");
      for (const text of ["若從 LINE 開啟，先從選單選擇在 Safari 中開啟。", "在 Safari 開啟本遊戲，點選分享，再選加入主畫面。", "若出現以網頁 App 打開，請開啟此選項，再點加入。", "離開 Safari，從手機主畫面上的 Eco-Mario 圖示開啟，再將手機橫放。"]){
        const li = document.createElement("li");li.textContent = text;steps.append(li);
      }
      const close = document.createElement("button");
      close.type = "button";close.textContent = "了解，返回遊戲";
      close.addEventListener("click", () => guide.close());
      guide.append(title, intro, steps, close);document.body.append(guide);
    }
    if (!guide.open) guide.showModal();
  };
  const sync = () => {
    root.classList.toggle("mobile-playing", !game.classList.contains("hidden"));
    root.classList.toggle("ios-standalone", iphone && standalone());
    button.hidden = androidApp || standalone();
    if (iphone) button.textContent = fullscreenElement() ? "⛶ 離開全螢幕" : nativeFullscreen() ? "⛶ 全螢幕" : "⛶ 全螢幕設定";
  };
  let fullscreenPending = false;
  button.addEventListener("click", async (event) => {
    event.preventDefault();event.stopImmediatePropagation();
    if (!iphone || standalone() || fullscreenPending) return;
    const request = nativeFullscreen();
    if (!fullscreenElement() && !request) { showGuide();return; }
    fullscreenPending = true;
    try {
      if (fullscreenElement()) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) await exit.call(document);
      } else await request.call(document.documentElement);
    } catch { showGuide(); }
    finally { fullscreenPending = false;sync();viewport(); }
  }, true);
  document.addEventListener("fullscreenchange", sync);
  document.addEventListener("webkitfullscreenchange", sync);
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
    subtitle.textContent = "點選角色啟動音樂 · ";
    const setup = document.createElement("button");
    setup.type = "button";setup.className = "ios-home-fullscreen";
    setup.textContent = standalone() ? "已從主畫面啟動" : "全螢幕開啟方式";
    setup.hidden = standalone();setup.addEventListener("click", showGuide);
    subtitle.append(setup);
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
