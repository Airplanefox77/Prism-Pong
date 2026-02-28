(() => {
  const STORAGE_KEY = "prismPong.device.v1";
  const SCALE_OPTIONS = ["mobile", "tablet", "desktop"];

  const session = {
    promptShown: false,
    pausePromptShown: false
  };

  const state = {
    guessScale: "desktop",
    guessLabel: "desktop",
    preferredScale: null,
    confirmed: false
  };

  let gameApi = null;
  let pendingScale = null;

  const ui = {
    promptLayer: document.getElementById("devicePrompt"),
    promptTitle: document.getElementById("devicePromptTitle"),
    promptMessage: document.getElementById("devicePromptMessage"),
    promptYes: document.getElementById("devicePromptYes"),
    promptNo: document.getElementById("devicePromptNo"),
    promptClose: document.getElementById("devicePromptClose"),
    touchControls: document.getElementById("touchControls"),
    confirmLayer: document.getElementById("deviceConfirm"),
    confirmMessage: document.getElementById("deviceConfirmMessage"),
    confirmYes: document.getElementById("deviceConfirmYes"),
    confirmNo: document.getElementById("deviceConfirmNo"),
    confirmOptions: document.getElementById("deviceConfirmOptions"),
    orientationPrompt: document.getElementById("orientationPrompt")
  };

  function getViewportSize() {
    const width = Math.min(window.innerWidth || 0, window.screen.width || 0) || window.innerWidth || window.screen.width || 0;
    const height = Math.min(window.innerHeight || 0, window.screen.height || 0) || window.innerHeight || window.screen.height || 0;
    return { width, height };
  }

  function detectDeviceScale() {
    const { width, height } = getViewportSize();
    const minSide = Math.min(width, height);
    const maxSide = Math.max(width, height);
    const coarsePointer = window.matchMedia ? window.matchMedia("(pointer: coarse)").matches : false;
    const touchPoints = navigator.maxTouchPoints || 0;
    const isTouch = coarsePointer || touchPoints > 1;
    const isTablet = isTouch && (minSide >= 720 || maxSide >= 900);
    const scale = isTouch ? (isTablet ? "tablet" : "mobile") : "desktop";
    const isIpadLike = /iPad/i.test(navigator.userAgent || "") || (navigator.platform === "MacIntel" && touchPoints > 1);
    let label = scale;
    if (scale === "tablet" && isIpadLike) {
      label = "iPad";
    }
    return { scale, label };
  }

  function loadDeviceState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return;
      }
      if (typeof parsed.preferredScale === "string" && SCALE_OPTIONS.includes(parsed.preferredScale)) {
        state.preferredScale = parsed.preferredScale;
      }
      state.confirmed = !!parsed.confirmed;
    } catch (_err) {
      state.preferredScale = null;
      state.confirmed = false;
    }
  }

  function saveDeviceState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        preferredScale: state.preferredScale,
        confirmed: state.confirmed
      }));
    } catch (_err) {
      // ignore storage failures
    }
  }

  function setBodyScale(scale) {
    document.body.classList.remove("device-scale-mobile", "device-scale-tablet", "device-scale-desktop", "device-touch");
    document.body.classList.add(`device-scale-${scale}`);
    if (scale !== "desktop") {
      document.body.classList.add("device-touch");
    }
  }

  function syncTouchControls(scale) {
    if (!ui.touchControls) {
      return;
    }
    const enabled = scale !== "desktop";
    ui.touchControls.setAttribute("aria-hidden", enabled ? "false" : "true");
  }

  function applyScale(scale, options = {}) {
    const nextScale = SCALE_OPTIONS.includes(scale) ? scale : "desktop";
    setBodyScale(nextScale);
    syncTouchControls(nextScale);
    pendingScale = { scale: nextScale, options };
    if (gameApi && gameApi.setDeviceScale) {
      gameApi.setDeviceScale(nextScale, { lockAi: nextScale !== "desktop" });
      pendingScale = null;
    }
    updateOrientationPrompt();
  }

  function updateOrientationPrompt() {
    if (!ui.orientationPrompt) {
      return;
    }
    const isPortrait = window.matchMedia ? window.matchMedia("(orientation: portrait)").matches : false;
    const show = isPortrait && document.body.classList.contains("device-touch");
    ui.orientationPrompt.classList.toggle("show", show);
    ui.orientationPrompt.setAttribute("aria-hidden", show ? "false" : "true");
  }

  function lockOrientationLandscape() {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock("landscape").catch(() => {});
    }
  }

  function requestFullscreenAndLock() {
    const root = document.documentElement;
    if (root.requestFullscreen) {
      root.requestFullscreen()
        .then(() => {
          lockOrientationLandscape();
        })
        .catch(() => {
          lockOrientationLandscape();
        });
    } else {
      lockOrientationLandscape();
    }
  }

  function openPrompt() {
    if (!ui.promptLayer) {
      return;
    }
    ui.promptLayer.classList.add("open");
    ui.promptLayer.setAttribute("aria-hidden", "false");
    if (gameApi && gameApi.setModalPause) {
      gameApi.setModalPause(true);
    }
  }

  function closePrompt() {
    if (!ui.promptLayer) {
      return;
    }
    ui.promptLayer.classList.remove("open");
    ui.promptLayer.setAttribute("aria-hidden", "true");
    if (gameApi && gameApi.setModalPause) {
      gameApi.setModalPause(false);
    }
  }

  function showInitialPrompt() {
    if (session.promptShown || state.preferredScale || state.guessScale === "desktop") {
      return;
    }
    session.promptShown = true;
    if (ui.promptTitle) {
      ui.promptTitle.textContent = `Switch to ${state.guessLabel} scaling?`;
    }
    if (ui.promptMessage) {
      ui.promptMessage.textContent = `Switch to ${state.guessLabel} scaling for better controls and layout.`;
    }
    openPrompt();
  }

  function openConfirmOverlay() {
    if (!ui.confirmLayer) {
      return;
    }
    ui.confirmLayer.classList.add("open");
    ui.confirmLayer.setAttribute("aria-hidden", "false");
    if (ui.confirmOptions) {
      ui.confirmOptions.setAttribute("aria-hidden", "true");
    }
    if (ui.confirmMessage) {
      ui.confirmMessage.textContent = `We think you're on ${state.guessLabel}. Did we guess your device correctly?`;
    }
  }

  function closeConfirmOverlay() {
    if (!ui.confirmLayer) {
      return;
    }
    ui.confirmLayer.classList.remove("open");
    ui.confirmLayer.setAttribute("aria-hidden", "true");
  }

  function maybeShowPausePrompt() {
    if (session.pausePromptShown || state.confirmed) {
      return;
    }
    if (state.guessScale === "desktop" && !state.preferredScale) {
      return;
    }
    session.pausePromptShown = true;
    openConfirmOverlay();
  }

  function confirmGuess() {
    state.confirmed = true;
    state.preferredScale = state.guessScale;
    saveDeviceState();
    applyScale(state.guessScale);
    closeConfirmOverlay();
  }

  function showDeviceOptions() {
    if (!ui.confirmOptions) {
      return;
    }
    ui.confirmOptions.setAttribute("aria-hidden", "false");
  }

  function applyDeviceChoice(scale) {
    state.confirmed = true;
    state.preferredScale = scale;
    saveDeviceState();
    applyScale(scale);
    if (scale !== "desktop") {
      requestFullscreenAndLock();
    }
    closeConfirmOverlay();
  }

  function wirePromptControls() {
    if (ui.promptYes) {
      ui.promptYes.addEventListener("click", () => {
        state.preferredScale = state.guessScale;
        state.confirmed = true;
        saveDeviceState();
        applyScale(state.guessScale);
        requestFullscreenAndLock();
        closePrompt();
      });
    }
    if (ui.promptNo) {
      ui.promptNo.addEventListener("click", () => {
        closePrompt();
      });
    }
    if (ui.promptClose) {
      ui.promptClose.addEventListener("click", () => {
        closePrompt();
      });
    }

    if (ui.confirmYes) {
      ui.confirmYes.addEventListener("click", () => {
        confirmGuess();
      });
    }
    if (ui.confirmNo) {
      ui.confirmNo.addEventListener("click", () => {
        showDeviceOptions();
      });
    }
    if (ui.confirmOptions) {
      ui.confirmOptions.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-device-option]");
        if (!btn) {
          return;
        }
        const scale = btn.getAttribute("data-device-option");
        if (SCALE_OPTIONS.includes(scale)) {
          applyDeviceChoice(scale);
        }
      });
    }
  }

  function wireTouchControls() {
    if (!ui.touchControls) {
      return;
    }
    ui.touchControls.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-touch-action]");
      if (!btn || !gameApi) {
        return;
      }
      const action = btn.getAttribute("data-touch-action");
      if (action === "flick-up") {
        gameApi.triggerFlickUp();
      } else if (action === "flick-down") {
        gameApi.triggerFlickDown();
      } else if (action === "overexpose") {
        gameApi.triggerOverexpose();
      } else if (action === "pause") {
        gameApi.openPauseMenu();
      }
    });
  }

  function attachApi(api) {
    gameApi = api;
    if (pendingScale && gameApi.setDeviceScale) {
      gameApi.setDeviceScale(pendingScale.scale, { lockAi: pendingScale.scale !== "desktop" });
      pendingScale = null;
    }
  }

  function init() {
    loadDeviceState();
    const guess = detectDeviceScale();
    state.guessScale = guess.scale;
    state.guessLabel = guess.label;

    wirePromptControls();
    wireTouchControls();
    updateOrientationPrompt();
    window.addEventListener("orientationchange", updateOrientationPrompt);
    window.addEventListener("resize", updateOrientationPrompt);

    if (state.preferredScale) {
      applyScale(state.preferredScale);
    } else {
      applyScale("desktop");
    }

    window.addEventListener("prism:pause-open", () => {
      maybeShowPausePrompt();
    });

    if (!state.preferredScale) {
      setTimeout(() => {
        showInitialPrompt();
      }, 650);
    }
  }

  window.PrismPongDevice = {
    attach(api) {
      attachApi(api);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
