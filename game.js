    (() => {
      const canvas = document.getElementById("pong");
      const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true }) || canvas.getContext("2d");

      const pointsLabel = document.getElementById("pointsLabel");
      const missesLabel = document.getElementById("missesLabel");
      const streakLabel = document.getElementById("streakLabel");
      const pointsValue = document.getElementById("pointsValue");
      const missesValue = document.getElementById("missesValue");
      const streakValue = document.getElementById("streakValue");
      const eventValue = document.getElementById("eventValue");
      const resetBtn = document.getElementById("resetBtn");
      const eventToast = document.getElementById("eventToast");
      const modeBadge = document.getElementById("modeBadge");

      const pauseLayer = document.getElementById("pauseLayer");
      const pauseTitle = document.getElementById("pauseTitle");
      const pauseMain = document.getElementById("pauseMain");
      const settingsPanel = document.getElementById("settingsPanel");
      const pauseResumeBtn = document.getElementById("pauseResumeBtn");
      const pauseSettingsBtn = document.getElementById("pauseSettingsBtn");
      const pauseRestartBtn = document.getElementById("pauseRestartBtn");
      const closePauseBtn = document.getElementById("closePauseBtn");
      const settingsBackBtn = document.getElementById("settingsBackBtn");

      const aiDifficulty = document.getElementById("aiDifficulty");
      const aiDifficultyValue = document.getElementById("aiDifficultyValue");
      const recentScoreList = document.getElementById("recentScoreList");
      const topScoreList = document.getElementById("topScoreList");
      const musicToggle = document.getElementById("musicToggle");
      const musicVolume = document.getElementById("musicVolume");
      const sfxToggle = document.getElementById("sfxToggle");
      const sfxVolume = document.getElementById("sfxVolume");
      const audioToggle = document.getElementById("audioToggle");
      const masterVolume = document.getElementById("masterVolume");
      const autoGraphicsToggle = document.getElementById("autoGraphicsToggle");
      const perfToggle = document.getElementById("perfToggle");
      const ultraPerfToggle = document.getElementById("ultraPerfToggle");
      const aiToggle = document.getElementById("aiToggle");
      const pointerAssistToggle = document.getElementById("pointerAssistToggle");
      const manualBlock = document.getElementById("manualBlock");
      const gameModeSelect = document.getElementById("gameModeSelect");

      const prismLeft = document.getElementById("prismLeft");
      const prismRight = document.getElementById("prismRight");
      const prismMeterLeftFill = document.getElementById("prismMeterLeftFill");
      const prismMeterRightFill = document.getElementById("prismMeterRightFill");
      const prismMeterLeftText = document.getElementById("prismMeterLeftText");
      const prismMeterRightText = document.getElementById("prismMeterRightText");
      const prismRightLabel = document.getElementById("prismRightLabel");

      const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));
      const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));

      const flickKeyMap = {
        p1Down: document.getElementById("keyA"),
        p1Up: document.getElementById("keyD"),
        p1Overexpose: document.getElementById("keyE"),
        p2Up: document.getElementById("keyLeft"),
        p2Down: document.getElementById("keyRight")
      };

      const PLAYER_COMBO_WINDOW_MS = 2800;
      const COMBO_BUFFER_MS = 3400;
      const PERFECT_FLICK_WINDOW_MS = 200;
      const PRISM_METER_MAX = 100;
      const PRISM_OVEREXPOSE_MS = 4500;
      const FREEZE_SLOW_FACTOR = 0.25;
      const SCORE_LOG_STORAGE_KEY = "prismPong.scoreLog.v1";
      const SCORE_LOG_RECENT_TTL_MS = 20 * 60 * 1000;
      const SCORE_LOG_TOP_TTL_MS = 14 * 24 * 60 * 60 * 1000;
      const SCORE_LOG_TOP_MAX = 10;
      const CHEAT_TERMINAL_MAX_LINES = 180;

      const state = {
        width: 960,
        height: 540,
        paused: false,
        menuOpen: false,
        pauseStartedAt: 0,
        flash: 0,
        shake: 0,
        hue: 0,
        score: {
          points: 0,
          misses: 0,
          streak: 0,
          player1: 0,
          player2: 0
        },
        settings: {
          aiEnabled: true,
          pointerAssist: true,
          audioEnabled: true,
          masterVolume: 0.8,
          musicEnabled: true,
          musicVolume: 0.35,
          sfxEnabled: true,
          sfxVolume: 0.8,
          autoGraphics: true,
          aiDifficulty: 6,
          performanceMode: false,
          ultraPerformanceMode: false,
          gameMode: "classic"
        },
        input: {
          p1Up: false,
          p1Down: false,
          p2Up: false,
          p2Down: false,
          pointerY: null,
          pointerActive: false
        },
        combo: {
          windowMs: PLAYER_COMBO_WINDOW_MS,
          inputs: [],
          pending: {
            left: null,
            right: null
          }
        },
        player: {
          x: 24,
          y: 220,
          width: 15,
          height: 116,
          baseHeight: 116,
          baseSpeed: 580,
          speed: 580,
          lastY: 220,
          flickTimer: 0,
          flickDir: 0
        },
        ai: {
          x: 920,
          y: 220,
          width: 15,
          height: 116,
          baseHeight: 116,
          baseSpeed: 470,
          speed: 470,
          baseManualSpeed: 620,
          manualSpeed: 620,
          lastY: 220,
          flickTimer: 0,
          flickDir: 0,
          actionCooldownUntil: 0,
          aimOffset: 0,
          aimRefreshAt: 0,
          confusedUntil: 0
        },
        ball: {
          x: 480,
          y: 270,
          vx: 340,
          vy: 170,
          radius: 11,
          baseRadius: 11,
          baseMaxSpeed: 900,
          maxSpeed: 900,
          respawnTimer: 0,
          trail: [],
          lastTouch: null,
          sticky: {
            attachedTo: null,
            timer: 0
          },
          charge: {
            active: false,
            owner: null,
            multiplier: 2,
            timer: 0
          },
          combo: {
            mode: null,
            timer: 0,
            duration: 0,
            baseVy: 0,
            travelDir: 1,
            speed: 0,
            vfxTick: 0,
            owner: null,
            freezeBoost: false,
            curveDir: 0
          }
        },
        events: {
          active: null,
          endsAt: 0,
          nextAt: 0,
          rainbow: false,
          sticky: false,
          freeze: false,
          large: false
        },
        prism: {
          left: {
            value: 0,
            overexposeTimer: 0,
            shatterTimer: 0
          },
          right: {
            value: 0,
            overexposeTimer: 0,
            shatterTimer: 0
          }
        },
        survival: {
          elapsedMs: 0,
          nextRampMs: 10000,
          level: 0
        },
        flick: {
          leftLastAt: -1,
          rightLastAt: -1
        },
        audio: {
          ctx: null,
          unlocked: false,
          nextBeatAt: 0,
          beatStep: 0
        },
        scoreLog: {
          recent: [],
          top: []
        },
        vfx: {
          particles: [],
          shockwaves: [],
          flickArrows: [],
          screenTint: 0,
          tintHue: 200,
          scorePulse: 0
        },
        cheats: {
          terminalOpen: false,
          terminalPauseOwned: false,
          terminalHistory: [],
          terminalHistoryIndex: -1,
          gameSpeedMultiplier: 1,
          forcedEvent: false,
          unlockAllCombos: false,
          aiVsAi: false,
          godmode: {
            left: false,
            right: false
          },
          barMax: {
            left: false,
            right: false
          },
          comboQueue: {
            left: [],
            right: []
          },
          leftAi: {
            aimOffset: 0,
            aimRefreshAt: 0,
            actionCooldownUntil: 0,
            confusedUntil: 0
          }
        },
        runtime: {
          frameMsEMA: 16.7,
          lagDetected: false,
          lagHoldUntil: 0,
          frameId: 0,
          dynamicDprScale: 1,
          fpsRecoverUntil: 0,
          fpsDegradeUntil: 0,
          autoPerfCooldownUntil: 0,
          hudNextSyncAt: 0,
          scoreLogNextPruneAt: 0,
          aiAdaptiveBias: 0,
          hudCache: {
            pointsLabel: "",
            missesLabel: "",
            streakLabel: "",
            pointsValue: "",
            missesValue: "",
            streakValue: "",
            modeBadge: "",
            eventValue: "",
            eventColor: "",
            prismLeftHeight: "",
            prismRightHeight: "",
            prismLeftText: "",
            prismRightText: "",
            prismRightLabel: "",
            leftOverexpose: false,
            rightOverexpose: false,
            leftShatter: false,
            rightShatter: false
          },
          compatibility: {
            isSafariLike: false,
            autoPerfApplied: false
          },
          vfxLimiter: {
            budgetFrameId: -1,
            generalBudget: 0,
            flickBudget: 0
          }
        }
      };

      const eventCatalog = {
        large: {
          label: "Large Ball",
          duration: 6500,
          announce: "Large Ball: bigger ball + smaller paddles"
        },
        rainbow: {
          label: "Rainbow Ball",
          duration: 5200,
          announce: "Rainbow Ball: 2x points + misses reduced on return"
        },
        freeze: {
          label: "Freeze Ball",
          duration: 3200,
          announce: "Freeze Ball: ball slowed to 25% speed"
        },
        sticky: {
          label: "Sticky Ball",
          duration: 7000,
          announce: "Sticky Ball: paddle catches ball briefly"
        }
      };

      const EVENT_WEIGHTS = [
        { name: "sticky", weight: 0.34 },
        { name: "large", weight: 0.31 },
        { name: "freeze", weight: 0.25 },
        { name: "rainbow", weight: 0.10 }
      ];

      const GAME_MODES = {
        classic: {
          label: "Classic Prism",
          eventsEnabled: true,
          eventMinMs: 6500,
          eventMaxMs: 14000,
          survival: false
        },
        chaos: {
          label: "Arcade Chaos",
          eventsEnabled: true,
          eventMinMs: 3200,
          eventMaxMs: 7600,
          survival: false
        },
        duel: {
          label: "Duel Mode",
          eventsEnabled: false,
          eventMinMs: 0,
          eventMaxMs: 0,
          survival: false
        },
        survival: {
          label: "Light Survival",
          eventsEnabled: true,
          eventMinMs: 5500,
          eventMaxMs: 11000,
          survival: true
        }
      };

      const FLICK_ANIM_MS = 180;
      const MAX_VFX_PARTICLES = 220;
      const MAX_VFX_SHOCKWAVES = 36;

      let lastFrame = performance.now();
      let cheatTerminalLayer = null;
      let cheatTerminalLog = null;
      let cheatTerminalInput = null;

      function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
      }

      function rand(min, max) {
        return min + Math.random() * (max - min);
      }

      function lerp(start, end, t) {
        return start + (end - start) * t;
      }

      function detectCompatibilityProfile() {
        const ua = navigator.userAgent || "";
        const vendor = navigator.vendor || "";
        const hasChrome = ua.includes("Chrome") || ua.includes("CriOS") || ua.includes("Chromium") || ua.includes("Edg/");
        const hasSafariSignature = ua.includes("Version/") && ua.includes("Safari/");
        const isSafariLike = ((ua.includes("Safari") && vendor.includes("Apple") && !hasChrome) || (hasSafariSignature && !hasChrome));

        state.runtime.compatibility.isSafariLike = isSafariLike;

        if (!state.settings.autoGraphics) {
          state.runtime.compatibility.autoPerfApplied = false;
          return;
        }

        if (isSafariLike && !state.runtime.compatibility.autoPerfApplied) {
          state.runtime.compatibility.autoPerfApplied = true;
          state.settings.performanceMode = true;
          state.settings.ultraPerformanceMode = false;
        }
      }

      function getModeConfig() {
        return GAME_MODES[state.settings.gameMode] || GAME_MODES.classic;
      }

      function getSideLabel(side) {
        if (side === "left") {
          return "P1";
        }
        return state.settings.aiEnabled ? "AI" : "P2";
      }

      function getOpponentSide(side) {
        return side === "left" ? "right" : "left";
      }

      function sideToTravelDir(side) {
        return side === "left" ? 1 : -1;
      }

      function travelDirToSide(dir) {
        return dir >= 0 ? "left" : "right";
      }

      function parseSideToken(token, fallback = null) {
        if (!token) {
          return fallback;
        }
        const value = token.toLowerCase();
        if (value === "p1" || value === "player1" || value === "left") {
          return "left";
        }
        if (value === "p2" || value === "player2" || value === "right" || value === "ai") {
          return "right";
        }
        return null;
      }

      function parseToggleToken(token) {
        if (!token) {
          return null;
        }
        const value = token.toLowerCase();
        if (["on", "true", "1", "enable", "enabled", "yes"].includes(value)) {
          return true;
        }
        if (["off", "false", "0", "disable", "disabled", "no"].includes(value)) {
          return false;
        }
        return null;
      }

      function resolveEventName(token) {
        if (!token) {
          return null;
        }
        const value = token.toLowerCase();
        const alias = {
          big: "large",
          largeball: "large",
          rainbowball: "rainbow",
          freezeball: "freeze",
          stickyball: "sticky"
        };
        const normalized = alias[value] || value;
        return eventCatalog[normalized] ? normalized : null;
      }

      function isCheatTerminalToggleKey(event) {
        return event.key === "`" || event.key === "~";
      }

      function shiftTimedSystemsBy(deltaMs) {
        if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
          return;
        }
        if (state.events.active) {
          state.events.endsAt += deltaMs;
        }
        if (Number.isFinite(state.events.nextAt)) {
          state.events.nextAt += deltaMs;
        }
      }

      function clearMovementInput() {
        state.input.p1Up = false;
        state.input.p1Down = false;
        state.input.p2Up = false;
        state.input.p2Down = false;
        state.input.pointerActive = false;
        state.input.pointerY = null;
      }

      function applyBarMaxCheats() {
        if (state.cheats.barMax.left) {
          state.prism.left.value = PRISM_METER_MAX;
          state.prism.left.overexposeTimer = 0;
          state.prism.left.shatterTimer = 0;
        }
        if (state.cheats.barMax.right) {
          state.prism.right.value = PRISM_METER_MAX;
          state.prism.right.overexposeTimer = 0;
          state.prism.right.shatterTimer = 0;
        }
      }

      function markHudDirty() {
        state.runtime.hudNextSyncAt = 0;
        syncHud(performance.now(), true);
      }

      function pushCheatTerminalLine(text, isError = false) {
        if (!cheatTerminalLog) {
          return;
        }
        const line = document.createElement("div");
        line.className = isError ? "cheat-terminal-line error" : "cheat-terminal-line";
        line.textContent = text;
        cheatTerminalLog.appendChild(line);
        while (cheatTerminalLog.childElementCount > CHEAT_TERMINAL_MAX_LINES) {
          cheatTerminalLog.removeChild(cheatTerminalLog.firstChild);
        }
        cheatTerminalLog.scrollTop = cheatTerminalLog.scrollHeight;
      }

      function openCheatTerminal() {
        ensureCheatTerminal();
        if (state.cheats.terminalOpen || !cheatTerminalLayer || !cheatTerminalInput) {
          return;
        }

        const now = performance.now();
        state.cheats.terminalOpen = true;
        state.cheats.terminalHistoryIndex = -1;

        if (!state.paused) {
          state.paused = true;
          state.pauseStartedAt = now;
          state.cheats.terminalPauseOwned = true;
        } else {
          state.cheats.terminalPauseOwned = false;
        }

        clearMovementInput();
        cheatTerminalLayer.classList.add("open");
        cheatTerminalLayer.setAttribute("aria-hidden", "false");
        cheatTerminalInput.value = "";
        cheatTerminalInput.focus();
        pushCheatTerminalLine("Terminal opened. Type /help to list commands.");
      }

      function closeCheatTerminal() {
        if (!state.cheats.terminalOpen) {
          return;
        }

        const now = performance.now();
        state.cheats.terminalOpen = false;
        state.cheats.terminalHistoryIndex = -1;

        if (cheatTerminalLayer) {
          cheatTerminalLayer.classList.remove("open");
          cheatTerminalLayer.setAttribute("aria-hidden", "true");
        }

        if (state.cheats.terminalPauseOwned && !state.menuOpen) {
          const delta = state.pauseStartedAt ? now - state.pauseStartedAt : 0;
          shiftTimedSystemsBy(delta);
          state.paused = false;
          state.pauseStartedAt = 0;
          lastFrame = now;
        }

        state.cheats.terminalPauseOwned = false;
      }

      function executeCheatCommand(rawCommand) {
        const raw = (rawCommand || "").trim();
        if (!raw) {
          return;
        }
        if (!raw.startsWith("/")) {
          pushCheatTerminalLine("Unknown format. Use /help for command usage.", true);
          return;
        }

        const parts = raw.slice(1).trim().split(/\s+/).filter(Boolean);
        const command = (parts.shift() || "").toLowerCase();
        const now = performance.now();

        if (command === "help") {
          pushCheatTerminalLine("/help");
          pushCheatTerminalLine("/godmode [p1|p2|ai] [on|off]");
          pushCheatTerminalLine("/event [large|rainbow|freeze|sticky|off] [seconds]");
          pushCheatTerminalLine("/points [number]");
          pushCheatTerminalLine("/misses [number]");
          pushCheatTerminalLine("/barfill [value 0-100] [p1|p2|ai]");
          pushCheatTerminalLine("/barmax [p1|p2|ai] [on|off]");
          pushCheatTerminalLine("/unlockallcombos [on|off]");
          pushCheatTerminalLine("/aivsai [on|off]");
          pushCheatTerminalLine("/gamespeed [percent] (100 = normal, 25 = freeze-like)");
          return;
        }

        if (command === "godmode") {
          const firstSide = parseSideToken(parts[0], null);
          const firstToggle = parseToggleToken(parts[0]);
          if (parts[0] && !firstSide && firstToggle === null) {
            pushCheatTerminalLine("Invalid argument. Use p1/p2/ai and optional on/off.", true);
            return;
          }
          const side = firstSide || "left";
          const toggleIdx = firstSide ? 1 : 0;
          const explicit = parseToggleToken(parts[toggleIdx]);
          const enabled = explicit === null ? true : explicit;
          state.cheats.godmode[side] = enabled;
          pushCheatTerminalLine("Godmode " + (enabled ? "enabled" : "disabled") + " for " + getSideLabel(side) + ".");
          return;
        }

        if (command === "event") {
          const eventNameRaw = parts[0];
          if (!eventNameRaw) {
            pushCheatTerminalLine("Usage: /event [large|rainbow|freeze|sticky|off] [seconds]", true);
            return;
          }
          const offValues = ["off", "none", "clear", "stop"];
          if (offValues.includes(eventNameRaw.toLowerCase())) {
            state.cheats.forcedEvent = false;
            endCurrentEvent(now);
            pushCheatTerminalLine("Event cleared.");
            markHudDirty();
            return;
          }

          const eventName = resolveEventName(eventNameRaw);
          if (!eventName) {
            pushCheatTerminalLine("Unknown event. Valid: large, rainbow, freeze, sticky.", true);
            return;
          }

          activateEvent(eventName, now);
          state.cheats.forcedEvent = true;
          state.events.nextAt = Number.POSITIVE_INFINITY;

          const seconds = Number(parts[1]);
          if (Number.isFinite(seconds) && seconds >= 0) {
            state.events.endsAt = now + seconds * 1000;
          }

          const durationSec = Math.max(0, (state.events.endsAt - now) / 1000).toFixed(1);
          pushCheatTerminalLine("Event " + eventName + " active for " + durationSec + "s.");
          markHudDirty();
          return;
        }

        if (command === "points") {
          const nextValue = Number(parts[0]);
          if (!Number.isFinite(nextValue)) {
            pushCheatTerminalLine("Usage: /points [number]", true);
            return;
          }
          const points = Math.max(0, Math.round(nextValue));
          state.score.points = points;
          state.score.player1 = points;
          pushCheatTerminalLine("Points set to " + points + ".");
          markHudDirty();
          return;
        }

        if (command === "misses") {
          const nextValue = Number(parts[0]);
          if (!Number.isFinite(nextValue)) {
            pushCheatTerminalLine("Usage: /misses [number]", true);
            return;
          }
          const misses = Math.max(0, Math.round(nextValue));
          state.score.misses = misses;
          state.score.player2 = misses;
          pushCheatTerminalLine("Misses set to " + misses + ".");
          markHudDirty();
          return;
        }

        if (command === "barfill") {
          let side = "left";
          let value = null;

          for (const token of parts) {
            const parsedSide = parseSideToken(token, null);
            if (parsedSide) {
              side = parsedSide;
              continue;
            }
            const parsedValue = Number(token);
            if (Number.isFinite(parsedValue)) {
              value = parsedValue;
              continue;
            }
          }

          if (value === null) {
            pushCheatTerminalLine("Usage: /barfill [value 0-100] [p1|p2|ai]", true);
            return;
          }

          const clamped = clamp(value, 0, PRISM_METER_MAX);
          const meter = state.prism[side];
          meter.value = clamped;
          meter.overexposeTimer = 0;
          meter.shatterTimer = 0;
          state.cheats.barMax[side] = false;
          pushCheatTerminalLine(getSideLabel(side) + " bar set to " + clamped.toFixed(1) + "%.");
          markHudDirty();
          return;
        }

        if (command === "barmax") {
          const firstSide = parseSideToken(parts[0], null);
          const firstToggle = parseToggleToken(parts[0]);
          if (parts[0] && !firstSide && firstToggle === null) {
            pushCheatTerminalLine("Invalid argument. Use p1/p2/ai and optional on/off.", true);
            return;
          }
          const side = firstSide || "left";
          const toggleIdx = firstSide ? 1 : 0;
          const explicit = parseToggleToken(parts[toggleIdx]);
          const enabled = explicit === null ? !state.cheats.barMax[side] : explicit;
          state.cheats.barMax[side] = enabled;
          applyBarMaxCheats();
          pushCheatTerminalLine("Barmax " + (enabled ? "enabled" : "disabled") + " for " + getSideLabel(side) + ".");
          markHudDirty();
          return;
        }

        if (command === "unlockallcombos") {
          const explicit = parseToggleToken(parts[0]);
          if (parts[0] && explicit === null) {
            pushCheatTerminalLine("Usage: /unlockallcombos [on|off]", true);
            return;
          }
          const enabled = explicit === null ? true : explicit;
          state.cheats.unlockAllCombos = enabled;
          if (!enabled) {
            state.cheats.comboQueue.left.length = 0;
            state.cheats.comboQueue.right.length = 0;
          }
          pushCheatTerminalLine("Unlock all combos " + (enabled ? "enabled." : "disabled."));
          return;
        }

        if (command === "aivsai") {
          const explicit = parseToggleToken(parts[0]);
          if (parts[0] && explicit === null) {
            pushCheatTerminalLine("Usage: /aivsai [on|off]", true);
            return;
          }
          const enabled = explicit === null ? true : explicit;
          state.cheats.aiVsAi = enabled;
          if (enabled) {
            state.settings.aiEnabled = true;
            state.cheats.leftAi.aimRefreshAt = 0;
            state.cheats.leftAi.actionCooldownUntil = 0;
            state.cheats.leftAi.confusedUntil = 0;
            state.ai.confusedUntil = 0;
            state.runtime.aiAdaptiveBias = 0;
            clearMovementInput();
          }
          syncSettingsUi();
          markHudDirty();
          pushCheatTerminalLine("AI vs AI " + (enabled ? "enabled." : "disabled."));
          return;
        }

        if (command === "gamespeed") {
          if (!parts.length) {
            pushCheatTerminalLine("Current gamespeed: " + Math.round(state.cheats.gameSpeedMultiplier * 100) + "%.");
            return;
          }
          const rawValue = parts[0].endsWith("%") ? parts[0].slice(0, -1) : parts[0];
          const parsed = Number(rawValue);
          if (!Number.isFinite(parsed)) {
            pushCheatTerminalLine("Usage: /gamespeed [percent]", true);
            return;
          }
          const multiplier = clamp(parsed / 100, 0, 4);
          state.cheats.gameSpeedMultiplier = multiplier;
          pushCheatTerminalLine("Gamespeed set to " + Math.round(multiplier * 100) + "%.");
          return;
        }

        pushCheatTerminalLine("Unknown command: /" + command + ". Use /help.", true);
      }

      function ensureCheatTerminal() {
        if (cheatTerminalLayer) {
          return;
        }

        const style = document.createElement("style");
        style.textContent = `
          #cheatTerminalLayer {
            position: fixed;
            inset: 0;
            display: none;
            align-items: center;
            justify-content: center;
            background: rgba(3, 8, 22, 0.84);
            z-index: 1000;
          }
          #cheatTerminalLayer.open {
            display: flex;
          }
          .cheat-terminal-panel {
            width: min(920px, 92vw);
            height: min(520px, 72vh);
            border: 1px solid rgba(126, 212, 255, 0.38);
            border-radius: 14px;
            background: linear-gradient(180deg, rgba(8, 22, 46, 0.98), rgba(3, 10, 25, 0.98));
            box-shadow: 0 26px 60px rgba(0, 0, 0, 0.42);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            color: #d7efff;
            font-family: "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace;
          }
          .cheat-terminal-header {
            padding: 10px 14px;
            border-bottom: 1px solid rgba(126, 212, 255, 0.24);
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 12px;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: #9ad8ff;
          }
          .cheat-terminal-log {
            flex: 1;
            padding: 12px 14px;
            overflow-y: auto;
            font-size: 13px;
            line-height: 1.55;
          }
          .cheat-terminal-line {
            white-space: pre-wrap;
            word-break: break-word;
          }
          .cheat-terminal-line.error {
            color: #ff9ea1;
          }
          .cheat-terminal-input-row {
            border-top: 1px solid rgba(126, 212, 255, 0.24);
            padding: 10px 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            color: #9ad8ff;
          }
          .cheat-terminal-input {
            flex: 1;
            background: transparent;
            border: none;
            outline: none;
            color: #f5fbff;
            font: inherit;
            font-size: 14px;
          }
          .cheat-terminal-footer {
            padding: 8px 14px 10px;
            font-size: 11px;
            color: rgba(180, 223, 255, 0.72);
          }
        `;
        document.head.appendChild(style);

        cheatTerminalLayer = document.createElement("div");
        cheatTerminalLayer.id = "cheatTerminalLayer";
        cheatTerminalLayer.setAttribute("aria-hidden", "true");

        const panel = document.createElement("div");
        panel.className = "cheat-terminal-panel";

        const header = document.createElement("div");
        header.className = "cheat-terminal-header";
        const headerTitle = document.createElement("span");
        headerTitle.textContent = "Cheat Terminal";
        const headerHint = document.createElement("span");
        headerHint.textContent = "~ or Esc to close";
        header.append(headerTitle, headerHint);

        cheatTerminalLog = document.createElement("div");
        cheatTerminalLog.className = "cheat-terminal-log";

        const inputRow = document.createElement("div");
        inputRow.className = "cheat-terminal-input-row";
        const prompt = document.createElement("span");
        prompt.textContent = ">";
        cheatTerminalInput = document.createElement("input");
        cheatTerminalInput.className = "cheat-terminal-input";
        cheatTerminalInput.type = "text";
        cheatTerminalInput.spellcheck = false;
        cheatTerminalInput.autocomplete = "off";
        cheatTerminalInput.autocapitalize = "off";
        cheatTerminalInput.placeholder = "/help";
        inputRow.append(prompt, cheatTerminalInput);

        const footer = document.createElement("div");
        footer.className = "cheat-terminal-footer";
        footer.textContent = "Commands start with /. Example: /godmode p1 on";

        panel.append(header, cheatTerminalLog, inputRow, footer);
        cheatTerminalLayer.appendChild(panel);
        document.body.appendChild(cheatTerminalLayer);

        cheatTerminalLayer.addEventListener("click", (event) => {
          if (event.target === cheatTerminalLayer && cheatTerminalInput) {
            cheatTerminalInput.focus();
          }
        });

        cheatTerminalInput.addEventListener("keydown", (event) => {
          event.stopPropagation();

          if (isCheatTerminalToggleKey(event)) {
            event.preventDefault();
            closeCheatTerminal();
            return;
          }

          if (event.key === "Escape") {
            event.preventDefault();
            closeCheatTerminal();
            return;
          }

          if (event.key === "ArrowUp") {
            const history = state.cheats.terminalHistory;
            if (!history.length) {
              return;
            }
            event.preventDefault();
            if (state.cheats.terminalHistoryIndex < 0) {
              state.cheats.terminalHistoryIndex = history.length - 1;
            } else {
              state.cheats.terminalHistoryIndex = Math.max(0, state.cheats.terminalHistoryIndex - 1);
            }
            cheatTerminalInput.value = history[state.cheats.terminalHistoryIndex] || "";
            return;
          }

          if (event.key === "ArrowDown") {
            const history = state.cheats.terminalHistory;
            if (!history.length) {
              return;
            }
            event.preventDefault();
            if (state.cheats.terminalHistoryIndex < 0 || state.cheats.terminalHistoryIndex >= history.length - 1) {
              state.cheats.terminalHistoryIndex = -1;
              cheatTerminalInput.value = "";
            } else {
              state.cheats.terminalHistoryIndex += 1;
              cheatTerminalInput.value = history[state.cheats.terminalHistoryIndex] || "";
            }
            return;
          }

          if (event.key === "Enter") {
            event.preventDefault();
            const raw = cheatTerminalInput.value.trim();
            if (!raw) {
              return;
            }
            state.cheats.terminalHistory.push(raw);
            if (state.cheats.terminalHistory.length > 50) {
              state.cheats.terminalHistory.shift();
            }
            state.cheats.terminalHistoryIndex = -1;
            pushCheatTerminalLine("> " + raw);
            executeCheatCommand(raw);
            cheatTerminalInput.value = "";
          }
        });

        pushCheatTerminalLine("Cheat terminal ready. Type /help.");
      }

      function getSurvivalSpeedMultiplier() {
        const config = getModeConfig();
        if (!config.survival) {
          return 1;
        }
        return 1 + state.survival.level * 0.1;
      }

      function refreshBallMaxSpeed() {
        state.ball.maxSpeed = state.ball.baseMaxSpeed * getSurvivalSpeedMultiplier();
      }

      function resetSurvivalState() {
        state.survival.elapsedMs = 0;
        state.survival.nextRampMs = 10000;
        state.survival.level = 0;
        refreshBallMaxSpeed();
      }

      function updateSurvivalRamp(dt) {
        const config = getModeConfig();
        if (!config.survival) {
          return;
        }

        state.survival.elapsedMs += dt * 1000;

        while (state.survival.elapsedMs >= state.survival.nextRampMs) {
          state.survival.level += 1;
          state.survival.nextRampMs += 10000;
          refreshBallMaxSpeed();

          const boost = 1.085;
          state.ball.vx *= boost;
          state.ball.vy *= boost;

          state.shake = Math.max(state.shake, 5);
          showToast("Light Survival Lv " + (state.survival.level + 1));
          playSfx("survival_ramp");
        }
      }

      function getPrismShotPower(side) {
        const meter = state.prism[side];
        let mult = 1 + (meter.value / PRISM_METER_MAX) * 0.24;
        if (meter.overexposeTimer > 0) {
          mult += 0.78;
        }
        return mult;
      }

      function getPrismScoreMultiplier(side) {
        const meter = state.prism[side];
        let mult = 1 + (meter.value / PRISM_METER_MAX) * 0.5;
        if (meter.overexposeTimer > 0) {
          mult += 0.55;
        }
        return mult;
      }

      function getOpponentSlowFactor(side) {
        const enemyMeter = state.prism[getOpponentSide(side)];
        let factor = 1 - (enemyMeter.value / PRISM_METER_MAX) * 0.18;
        if (enemyMeter.overexposeTimer > 0) {
          factor -= 0.3;
        }
        return clamp(factor, enemyMeter.overexposeTimer > 0 ? 0.34 : 0.62, 1);
      }

      function getShotSpeedCap(side, baseBonus) {
        const overBoost = state.prism[side].overexposeTimer > 0 ? 520 : 0;
        return state.ball.maxSpeed + baseBonus + overBoost;
      }

      function getAiDifficultyFactor() {
        return clamp((state.settings.aiDifficulty - 1) / 9, 0, 1);
      }

      function getAdaptiveAiDifficultyFactor(side = "right") {
        const base = getAiDifficultyFactor();
        if (side !== "right" || !state.settings.aiEnabled || state.cheats.aiVsAi) {
          return base;
        }

        const scoreDelta = state.score.points - state.score.misses;
        const scorePressure = clamp(scoreDelta / 14, -1, 1);
        const streakPressure = clamp((state.score.streak - 2) / 12, -0.35, 0.35);
        const targetBias = clamp(scorePressure * 0.44 + streakPressure, -0.42, 0.48);

        state.runtime.aiAdaptiveBias += (targetBias - state.runtime.aiAdaptiveBias) * 0.045;
        return clamp(base + state.runtime.aiAdaptiveBias, 0.04, 1);
      }

      function isComboThreatForSide(side) {
        return !!state.ball.combo.mode && state.ball.combo.owner === getOpponentSide(side);
      }

      function maybeTriggerAiConfusion(side, brain, difficulty, now) {
        if (!isComboThreatForSide(side) || now < brain.confusedUntil) {
          return;
        }

        const confuseChance = lerp(0.24, 0.06, difficulty);
        if (Math.random() < confuseChance) {
          brain.confusedUntil = now + rand(260, 680);
          brain.aimOffset += rand(-220, 220);
        }
      }

      function canActivateOverexpose(side) {
        const meter = state.prism[side];
        return meter.overexposeTimer <= 0 && meter.value >= PRISM_METER_MAX;
      }

      function activateOverexpose(side, announce = true) {
        if (!canActivateOverexpose(side)) {
          return false;
        }

        const meter = state.prism[side];
        meter.value = 0;
        meter.overexposeTimer = PRISM_OVEREXPOSE_MS;
        meter.shatterTimer = 0;

        const x = side === "left" ? state.width * 0.24 : state.width * 0.76;
        spawnShockwave(x, state.height * 0.5, hslColor(44, 100, 74, 0.9), 3.4, 190, 620);
        spawnImpactVfx(x, state.height * 0.5, 44, sideToTravelDir(side), 0, 1.7);
        state.vfx.screenTint = Math.max(state.vfx.screenTint, 0.34);
        state.vfx.tintHue = 44;
        state.shake = Math.max(state.shake, 12);

        if (announce) {
          const suffix = side === "left" ? " • overdrive online" : " • AI overdrive";
          showToast(getSideLabel(side) + " triggered Overexpose" + suffix);
        }
        playSfx("overexpose_start");
        return true;
      }

      function clearBallCharge() {
        state.ball.charge.active = false;
        state.ball.charge.owner = null;
        state.ball.charge.multiplier = 2;
        state.ball.charge.timer = 0;
      }

      function armPerfectCharge(side) {
        state.ball.charge.active = true;
        state.ball.charge.owner = side;
        state.ball.charge.multiplier = 2;
        state.ball.charge.timer = 3200;

        spawnShockwave(state.ball.x, state.ball.y, hslColor(44, 100, 72, 0.85), 2.8, 104, 420);
        spawnImpactVfx(state.ball.x, state.ball.y, 44, sideToTravelDir(side), 0, 1.15);
        showToast(getSideLabel(side) + " Perfect Flick: Charge x2");
        playSfx("perfect_flick");
      }

      function consumeChargeMultiplier(side) {
        if (!state.ball.charge.active || state.ball.charge.owner !== side) {
          return 1;
        }

        const mult = state.ball.charge.multiplier || 2;
        clearBallCharge();
        return mult;
      }

      function addPrism(side, amount, showBurst = true) {
        if (!side || amount <= 0) {
          return;
        }

        const meter = state.prism[side];

        if (meter.overexposeTimer > 0) {
          return;
        }

        const wasBelowCap = meter.value < PRISM_METER_MAX;
        meter.value = clamp(meter.value + amount, 0, PRISM_METER_MAX);

        if (meter.value >= PRISM_METER_MAX && wasBelowCap) {
          if (showBurst) {
            const x = side === "left" ? state.width * 0.22 : state.width * 0.78;
            const intensity = 1.2;
            spawnShockwave(x, state.height * 0.5, hslColor(40, 100, 74, 0.86), 3.2, 170, 560);
            spawnImpactVfx(x, state.height * 0.5, 40, sideToTravelDir(side), 0, intensity);
          }
          showToast(getSideLabel(side) + (side === "left" ? " Overexpose ready • press E" : " Overexpose ready"));
          playSfx("event_start");
        }
      }

      function shatterPrism(side) {
        const meter = state.prism[side];
        if (meter.value <= 0 && meter.overexposeTimer <= 0) {
          return;
        }

        meter.value = 0;
        meter.overexposeTimer = 0;
        meter.shatterTimer = 520;

        const x = side === "left" ? state.width * 0.18 : state.width * 0.82;
        spawnImpactVfx(x, state.height * 0.5, 352, sideToTravelDir(side), 0, 1.5);
        spawnShockwave(x, state.height * 0.5, hslColor(352, 100, 72, 0.8), 2.8, 130, 440);
        playSfx("meter_shatter");
      }

      function scoreWithPrism(baseValue, side, consumeCharge = true) {
        let multiplier = getPrismScoreMultiplier(side);

        if (state.ball.combo.mode && state.ball.combo.owner === side) {
          multiplier += state.ball.combo.freezeBoost ? 0.42 : 0.22;
        }

        if (consumeCharge) {
          multiplier *= consumeChargeMultiplier(side);
        }

        return Math.max(1, Math.round(baseValue * multiplier));
      }

      function queueCombo(side, type, label) {
        const now = performance.now();
        const entry = {
          type,
          label,
          expiresAt: now + COMBO_BUFFER_MS
        };
        if (state.cheats.unlockAllCombos) {
          state.cheats.comboQueue[side].push(entry);
          showToast(getSideLabel(side) + " combo banked: " + label);
          return;
        }
        state.combo.pending[side] = entry;
        showToast(getSideLabel(side) + " combo primed: " + label);
      }

      function pruneComboBuffers(now) {
        if (state.cheats.comboQueue.left.length) {
          state.cheats.comboQueue.left = state.cheats.comboQueue.left.filter((entry) => now <= entry.expiresAt);
        }
        if (state.cheats.comboQueue.right.length) {
          state.cheats.comboQueue.right = state.cheats.comboQueue.right.filter((entry) => now <= entry.expiresAt);
        }

        if (state.combo.pending.left && now > state.combo.pending.left.expiresAt) {
          state.combo.pending.left = null;
        }

        if (state.combo.pending.right && now > state.combo.pending.right.expiresAt) {
          state.combo.pending.right = null;
        }
      }

      function tryApplyBufferedCombo(side, showCue = true) {
        if (state.cheats.unlockAllCombos && state.cheats.comboQueue[side].length) {
          const queue = state.cheats.comboQueue[side];
          let activatedCount = 0;
          let index = 0;
          const now = performance.now();

          while (index < queue.length) {
            const pending = queue[index];
            if (now > pending.expiresAt) {
              queue.splice(index, 1);
              continue;
            }

            const activated = applyComboMove(side, pending.type, showCue && activatedCount === 0);
            if (!activated) {
              break;
            }

            activatedCount += 1;
            queue.splice(index, 1);
          }

          if (activatedCount > 1) {
            showToast(getSideLabel(side) + " unleashed " + activatedCount + " combos");
          }

          return activatedCount > 0;
        }

        const pending = state.combo.pending[side];
        if (!pending) {
          return false;
        }

        const now = performance.now();
        if (now > pending.expiresAt) {
          state.combo.pending[side] = null;
          return false;
        }

        const activated = applyComboMove(side, pending.type, showCue);
        if (activated) {
          state.combo.pending[side] = null;
        }
        return activated;
      }

      function formatTimeMs(ms) {
        const totalSec = Math.max(0, Math.floor(ms / 1000));
        const minutes = Math.floor(totalSec / 60).toString().padStart(2, "0");
        const seconds = (totalSec % 60).toString().padStart(2, "0");
        return minutes + ":" + seconds;
      }

      function formatLogTime(ts) {
        const date = new Date(ts);
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }

      function hasMatchProgress() {
        return (
          state.score.points > 0 ||
          state.score.misses > 0 ||
          state.score.player1 > 0 ||
          state.score.player2 > 0
        );
      }

      function getCurrentRunScore() {
        if (state.settings.aiEnabled) {
          return state.score.points;
        }
        return Math.max(state.score.player1, state.score.player2);
      }

      function buildScoreLogEntry(reason = "reset") {
        return {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
          ts: Date.now(),
          score: getCurrentRunScore(),
          aiEnabled: state.settings.aiEnabled,
          gameMode: state.settings.gameMode,
          modeLabel: getModeConfig().label,
          player1: state.score.player1,
          player2: state.score.player2,
          misses: state.score.misses,
          reason
        };
      }

      function normalizeScoreLogEntry(entry) {
        if (!entry || typeof entry !== "object") {
          return null;
        }
        const score = Number(entry.score);
        const ts = Number(entry.ts);
        if (!Number.isFinite(score) || score < 0 || !Number.isFinite(ts) || ts <= 0) {
          return null;
        }
        return {
          id: typeof entry.id === "string" && entry.id ? entry.id : ts.toString(36),
          ts,
          score: Math.round(score),
          aiEnabled: !!entry.aiEnabled,
          gameMode: typeof entry.gameMode === "string" ? entry.gameMode : "classic",
          modeLabel: typeof entry.modeLabel === "string" && entry.modeLabel ? entry.modeLabel : "Classic Prism",
          player1: Number.isFinite(Number(entry.player1)) ? Math.max(0, Math.round(Number(entry.player1))) : 0,
          player2: Number.isFinite(Number(entry.player2)) ? Math.max(0, Math.round(Number(entry.player2))) : 0,
          misses: Number.isFinite(Number(entry.misses)) ? Math.max(0, Math.round(Number(entry.misses))) : 0,
          reason: typeof entry.reason === "string" ? entry.reason : "reset"
        };
      }

      function pruneScoreLogs(now = Date.now()) {
        let changed = false;

        const nextRecent = state.scoreLog.recent
          .map(normalizeScoreLogEntry)
          .filter(Boolean)
          .filter((entry) => now - entry.ts <= SCORE_LOG_RECENT_TTL_MS)
          .sort((a, b) => b.ts - a.ts)
          .slice(0, 40);
        if (nextRecent.length !== state.scoreLog.recent.length) {
          changed = true;
        }

        const nextTop = state.scoreLog.top
          .map(normalizeScoreLogEntry)
          .filter(Boolean)
          .filter((entry) => now - entry.ts <= SCORE_LOG_TOP_TTL_MS)
          .sort((a, b) => (b.score - a.score) || (b.ts - a.ts))
          .slice(0, SCORE_LOG_TOP_MAX);
        if (nextTop.length !== state.scoreLog.top.length) {
          changed = true;
        }

        state.scoreLog.recent = nextRecent;
        state.scoreLog.top = nextTop;
        return changed;
      }

      function saveScoreLogs() {
        try {
          localStorage.setItem(SCORE_LOG_STORAGE_KEY, JSON.stringify(state.scoreLog));
        } catch (_err) {
          // ignore storage failures (private mode / quota)
        }
      }

      function loadScoreLogs() {
        try {
          const raw = localStorage.getItem(SCORE_LOG_STORAGE_KEY);
          if (!raw) {
            return;
          }
          const parsed = JSON.parse(raw);
          state.scoreLog.recent = Array.isArray(parsed.recent) ? parsed.recent : [];
          state.scoreLog.top = Array.isArray(parsed.top) ? parsed.top : [];
          const changed = pruneScoreLogs(Date.now());
          if (changed) {
            saveScoreLogs();
          }
        } catch (_err) {
          state.scoreLog.recent = [];
          state.scoreLog.top = [];
        }
      }

      function renderScoreEntries(target, entries, emptyText) {
        if (!target) {
          return;
        }
        target.textContent = "";
        if (!entries.length) {
          const empty = document.createElement("li");
          empty.textContent = emptyText;
          target.appendChild(empty);
          return;
        }

        for (const entry of entries) {
          const li = document.createElement("li");

          const main = document.createElement("div");
          main.className = "score-line";
          const scoreText = document.createElement("strong");
          scoreText.textContent = String(entry.score);
          const stamp = document.createElement("span");
          stamp.textContent = formatLogTime(entry.ts);
          main.append(scoreText, stamp);

          const mode = document.createElement("div");
          mode.className = "score-mode";
          mode.textContent = entry.modeLabel;

          const meta = document.createElement("div");
          if (entry.aiEnabled) {
            meta.textContent = "AI • misses " + entry.misses + " • P1 " + entry.player1;
          } else {
            meta.textContent = "P1 " + entry.player1 + " vs P2 " + entry.player2;
          }

          li.append(main, mode, meta);
          target.appendChild(li);
        }
      }

      function renderScoreLogs() {
        renderScoreEntries(recentScoreList, state.scoreLog.recent, "No recent runs yet.");
        renderScoreEntries(topScoreList, state.scoreLog.top, "No top runs yet.");
      }

      function recordScoreLogIfNeeded(reason = "reset") {
        if (!hasMatchProgress()) {
          return;
        }

        const entry = buildScoreLogEntry(reason);
        state.scoreLog.recent.unshift(entry);
        state.scoreLog.top.push(entry);
        pruneScoreLogs(Date.now());
        saveScoreLogs();
        renderScoreLogs();
      }

      function updateAiDifficultyLabel() {
        if (aiDifficultyValue) {
          aiDifficultyValue.textContent = state.settings.aiDifficulty + " / 10";
        }
      }

      function updateLagState(frameMs, now) {
        const runtime = state.runtime;
        runtime.frameMsEMA = runtime.frameMsEMA * 0.9 + frameMs * 0.1;

        if (frameMs > 34 || runtime.frameMsEMA > 22) {
          runtime.lagHoldUntil = now + 2200;
        }

        runtime.lagDetected = now < runtime.lagHoldUntil;

        if (runtime.frameMsEMA > 24) {
          if (now > runtime.fpsDegradeUntil) {
            runtime.fpsDegradeUntil = now + 1100;
            runtime.dynamicDprScale = Math.max(0.72, runtime.dynamicDprScale - 0.08);
            resize();
          }
        } else if (runtime.frameMsEMA < 17.4 && !runtime.lagDetected) {
          if (now > runtime.fpsRecoverUntil) {
            runtime.fpsRecoverUntil = now + 2800;
            runtime.dynamicDprScale = Math.min(1, runtime.dynamicDprScale + 0.04);
            resize();
          }
        }

        if (state.settings.autoGraphics && runtime.frameMsEMA > 31 && !state.settings.performanceMode && now > runtime.autoPerfCooldownUntil) {
          runtime.autoPerfCooldownUntil = now + 9000;
          state.settings.performanceMode = true;
          state.settings.ultraPerformanceMode = false;
          syncSettingsUi();
          resize();
          showToast("Auto graphics enabled Performance mode for smoother FPS");
        }
      }

      function getPerformanceTier() {
        if (state.settings.ultraPerformanceMode) {
          return 2;
        }
        if (state.settings.performanceMode) {
          return 1;
        }
        return 0;
      }

      function getVfxDensity() {
        const tier = getPerformanceTier();
        let density = 1;

        if (tier === 2) {
          density = 0.2;
        } else if (tier === 1) {
          density = 0.32;
        }

        if (state.runtime.compatibility.isSafariLike) {
          density *= 0.74;
        }

        if (state.runtime.lagDetected) {
          density *= 0.3;
        }

        return Math.max(0.06, density);
      }

      function getTrailLimit() {
        const tier = getPerformanceTier();
        let limit = 14;

        if (tier === 2) {
          limit = 5;
        } else if (tier === 1) {
          limit = 9;
        }

        if (state.runtime.lagDetected) {
          limit = Math.max(3, Math.floor(limit * 0.55));
        }

        return limit;
      }

      function getVfxCaps() {
        const tier = getPerformanceTier();
        const lag = state.runtime.lagDetected;
        const safariLike = state.runtime.compatibility.isSafariLike;

        return {
          particle: lag ? 42 : (tier === 2 ? 68 : tier === 1 ? 98 : (safariLike ? 150 : MAX_VFX_PARTICLES)),
          shockwave: lag ? 4 : (tier === 2 ? 0 : tier === 1 ? 6 : (safariLike ? 18 : MAX_VFX_SHOCKWAVES)),
          flickArrow: lag ? 4 : (tier === 2 ? 0 : tier === 1 ? 6 : (safariLike ? 14 : 22))
        };
      }

      function refreshVfxSpawnBudget() {
        const limiter = state.runtime.vfxLimiter;
        const frameId = state.runtime.frameId;
        if (limiter.budgetFrameId === frameId) {
          return;
        }

        const tier = getPerformanceTier();
        const lag = state.runtime.lagDetected;
        limiter.budgetFrameId = frameId;
        limiter.generalBudget = lag ? 2 : (tier === 2 ? 3 : tier === 1 ? 5 : 14);
        limiter.flickBudget = lag ? 1 : (tier === 2 ? 0 : tier === 1 ? 1 : 2);
      }

      function clearBallCombo() {
        state.ball.combo.mode = null;
        state.ball.combo.timer = 0;
        state.ball.combo.duration = 0;
        state.ball.combo.baseVy = 0;
        state.ball.combo.travelDir = 1;
        state.ball.combo.speed = 0;
        state.ball.combo.vfxTick = 0;
        state.ball.combo.owner = null;
        state.ball.combo.freezeBoost = false;
        state.ball.combo.curveDir = 0;
      }

      function trimEffectsForPerformance() {
        const tier = getPerformanceTier();
        const lag = state.runtime.lagDetected;
        const caps = getVfxCaps();
        const particleCap = lag ? Math.min(caps.particle, 48) : caps.particle;
        const waveCap = caps.shockwave;
        const arrowCap = caps.flickArrow;
        const trailCap = getTrailLimit();

        if (state.vfx.particles.length > particleCap) {
          state.vfx.particles.splice(0, state.vfx.particles.length - particleCap);
        }
        if (state.vfx.shockwaves.length > waveCap) {
          state.vfx.shockwaves.splice(0, state.vfx.shockwaves.length - waveCap);
        }
        if (state.vfx.flickArrows.length > arrowCap) {
          state.vfx.flickArrows.splice(0, state.vfx.flickArrows.length - arrowCap);
        }
        if (state.ball.trail.length > trailCap) {
          state.ball.trail.splice(0, state.ball.trail.length - trailCap);
        }

        if (tier === 2 || lag) {
          state.vfx.screenTint = Math.min(state.vfx.screenTint, lag ? 0.08 : 0.16);
          state.vfx.scorePulse = Math.min(state.vfx.scorePulse, lag ? 0.12 : 0.18);
        }
      }

      function canSpawnGeneralVfx() {
        refreshVfxSpawnBudget();
        const limiter = state.runtime.vfxLimiter;
        if (limiter.generalBudget <= 0) {
          return false;
        }

        limiter.generalBudget -= 1;
        return true;
      }

      function canSpawnFlickVfx() {
        refreshVfxSpawnBudget();
        const limiter = state.runtime.vfxLimiter;
        if (limiter.flickBudget <= 0) {
          return false;
        }

        limiter.flickBudget -= 1;
        return true;
      }

      function hslColor(hue, sat, light, alpha = 1) {
        const h = ((hue % 360) + 360) % 360;
        return `hsla(${h} ${sat}% ${light}% / ${alpha})`;
      }

      function pushVfxParticle(particle) {
        const particleCap = getVfxCaps().particle;
        state.vfx.particles.push(particle);
        if (state.vfx.particles.length > particleCap) {
          state.vfx.particles.splice(0, state.vfx.particles.length - particleCap);
        }
      }

      function spawnShockwave(x, y, color, width = 2.2, maxRadius = 110, durationMs = 360) {
        const tier = getPerformanceTier();
        if (tier === 2) {
          return;
        }

        if (!canSpawnGeneralVfx()) {
          return;
        }

        const shockwaveCap = getVfxCaps().shockwave;
        if (shockwaveCap <= 0) {
          return;
        }

        state.vfx.shockwaves.push({
          x,
          y,
          r: 8,
          maxRadius,
          life: durationMs,
          maxLife: durationMs,
          width,
          color
        });

        if (state.vfx.shockwaves.length > shockwaveCap) {
          state.vfx.shockwaves.splice(0, state.vfx.shockwaves.length - shockwaveCap);
        }
      }

      function spawnImpactVfx(x, y, baseHue, dirX = 0, dirY = 0, intensity = 1) {
        if (!canSpawnGeneralVfx()) {
          return;
        }

        const density = getVfxDensity();
        const particleCount = Math.max(2, Math.floor(14 * intensity * density));

        for (let i = 0; i < particleCount; i += 1) {
          const speed = rand(130, 430) * (0.55 + intensity * 0.45);
          const vx = (dirX + rand(-1.05, 1.05)) * speed;
          const vy = (dirY + rand(-1.05, 1.05)) * speed;

          pushVfxParticle({
            x,
            y,
            vx,
            vy,
            size: rand(1.2, 3.9),
            life: rand(170, 440),
            maxLife: rand(170, 440),
            drag: rand(1.5, 4.2),
            hue: baseHue + rand(-16, 16),
            sat: rand(78, 98),
            light: rand(58, 78),
            alpha: rand(0.36, 0.92),
            glow: rand(5, 12)
          });
        }

        spawnShockwave(
          x,
          y,
          hslColor(baseHue + rand(-8, 8), 100, 74, 0.72),
          1.6 + intensity * 1.1,
          88 + intensity * 52,
          310 + intensity * 130
        );
      }

      function spawnGoalVfx(side) {
        const x = side === "right" ? state.width - 10 : 10;
        const y = state.height * 0.5;
        const dirX = side === "right" ? -1 : 1;
        const hue = side === "right" ? 196 : 352;

        spawnImpactVfx(x, y, hue, dirX * 1.2, 0, 1.9);
        spawnShockwave(x, y, hslColor(hue, 96, 70, 0.85), 3.6, 210, 560);

        state.vfx.scorePulse = Math.min(1, state.vfx.scorePulse + 0.78);
        state.vfx.screenTint = Math.min(0.55, state.vfx.screenTint + 0.26);
        state.vfx.tintHue = hue;
      }

      function spawnFlickTrail(side, dirSign) {
        if (!canSpawnFlickVfx()) {
          return;
        }

        const tier = getPerformanceTier();
        const caps = getVfxCaps();
        const paddle = side === "left" ? state.player : state.ai;
        const dirX = side === "left" ? 1 : -1;
        const dirY = dirSign * 0.82;

        const originX = side === "left" ? paddle.x + paddle.width + 6 : paddle.x - 6;
        const originY = paddle.y + paddle.height * 0.5 + dirSign * paddle.height * 0.24;

        if (tier < 2) {
          state.vfx.flickArrows.push({
            x: originX,
            y: originY,
            vx: dirX * 650,
            vy: dirY * 440,
            dirX,
            dirY,
            life: tier === 1 ? 200 : 240,
            maxLife: tier === 1 ? 200 : 240,
            hue: dirSign < 0 ? 198 : 20,
            width: tier === 1 ? 1.8 : 2.2
          });

          const arrowCap = caps.flickArrow;
          if (state.vfx.flickArrows.length > arrowCap) {
            state.vfx.flickArrows.splice(0, state.vfx.flickArrows.length - arrowCap);
          }
        }

        const intensity = tier === 2 ? 0.6 : tier === 1 ? 0.9 : 1.25;
        spawnImpactVfx(originX, originY, dirSign < 0 ? 198 : 20, dirX * 0.95, dirY * 1.05, intensity);

        state.vfx.screenTint = Math.min(0.48, state.vfx.screenTint + (tier === 2 ? 0.04 : tier === 1 ? 0.07 : 0.1));
        state.vfx.tintHue = dirSign < 0 ? 198 : 20;
      }

      function spawnComboRainbowVfx(x, y, dirX, dirY, intensity = 1) {
        if (!canSpawnGeneralVfx()) {
          return;
        }

        const tier = getPerformanceTier();
        const density = getVfxDensity();
        const count = Math.max(2, Math.floor((tier === 1 ? 6 : 11) * density * intensity));

        for (let i = 0; i < count; i += 1) {
          const speed = rand(180, 440) * (0.4 + intensity * 0.5);
          pushVfxParticle({
            x,
            y,
            vx: (dirX + rand(-0.55, 0.55)) * speed,
            vy: (dirY + rand(-0.55, 0.55)) * speed,
            size: rand(1.1, 3.2),
            life: rand(160, 340),
            maxLife: rand(160, 340),
            drag: rand(1.7, 3.9),
            hue: state.hue + rand(-110, 110),
            sat: rand(84, 100),
            light: rand(58, 74),
            alpha: tier === 1 ? rand(0.22, 0.5) : rand(0.45, 0.88),
            glow: tier === 1 ? rand(2, 5) : rand(6, 12)
          });
        }

        if (tier === 0 && intensity >= 1) {
          spawnShockwave(x, y, hslColor(state.hue + rand(-20, 20), 100, 70, 0.76), 2.2, 120, 360);
        }
      }

      function applyComboMove(side, type, showCue = true) {
        if (state.paused || state.ball.respawnTimer > 0) {
          return false;
        }

        const isLeft = side === "left";
        const paddle = isLeft ? state.player : state.ai;
        const attachedToThis = state.ball.sticky.attachedTo === (isLeft ? "player" : "ai");

        if (!attachedToThis && !isBallCloseToPaddle(paddle, side)) {
          return false;
        }

        const travelDir = sideToTravelDir(side);
        const currentSpeed = Math.hypot(state.ball.vx, state.ball.vy);
        const shotPower = getPrismShotPower(side);
        const comboSpeed = clamp((currentSpeed + 430) * shotPower, 760, getShotSpeedCap(side, 420));

        if (attachedToThis) {
          let releaseDir = 0;
          if (type === "burstUp" || type === "curveUp") {
            releaseDir = -1;
          } else if (type === "burstDown" || type === "curveDown") {
            releaseDir = 1;
          }
          releaseStickyBall(releaseDir, false);
        }

        if (type === "wave") {
          state.ball.vx = travelDir * comboSpeed * 0.95;
          state.ball.vy = 0;
          state.ball.combo.mode = "wave";
          state.ball.combo.timer = 760;
          state.ball.combo.duration = 760;
          state.ball.combo.baseVy = clamp((paddle.y - paddle.lastY) * 8, -200, 200);
          state.ball.combo.travelDir = travelDir;
          state.ball.combo.speed = Math.abs(state.ball.vx);
          state.ball.combo.vfxTick = 0;
          state.ball.combo.owner = side;
          state.ball.combo.freezeBoost = !!state.events.freeze;
          state.ball.combo.curveDir = 0;
          triggerPaddleFlick(paddle, -1);
          spawnFlickTrail(side, -1);
          spawnFlickTrail(side, 1);
          if (showCue) {
            showToast(getSideLabel(side) + " Combo: Prism Zigzag");
          }
          playSfx("combo_wave");
        } else if (type === "curveUp" || type === "curveDown") {
          const curveDir = type === "curveUp" ? -1 : 1;
          const curveSpeed = clamp(comboSpeed * 0.9, 820, getShotSpeedCap(side, 420));
          state.ball.vx = travelDir * curveSpeed;
          state.ball.vy = 0;
          state.ball.combo.mode = "curve";
          state.ball.combo.timer = 690;
          state.ball.combo.duration = 690;
          state.ball.combo.baseVy = curveDir * clamp(curveSpeed * 0.88, 420, 980);
          state.ball.combo.travelDir = travelDir;
          state.ball.combo.speed = Math.abs(state.ball.vx);
          state.ball.combo.vfxTick = 0;
          state.ball.combo.owner = side;
          state.ball.combo.freezeBoost = !!state.events.freeze;
          state.ball.combo.curveDir = curveDir;
          triggerPaddleFlick(paddle, curveDir);
          spawnFlickTrail(side, curveDir);
          if (showCue) {
            const label = curveDir < 0 ? "Curve Up" : "Curve Down";
            showToast(getSideLabel(side) + " Combo: " + label);
          }
          playSfx("combo_wave");
        } else {
          const burstDir = type === "burstUp" ? -1 : 1;
          const burstSpeed = clamp(comboSpeed * 0.94, 860, getShotSpeedCap(side, 460));
          state.ball.vx = travelDir * burstSpeed * 0.86;
          state.ball.vy = burstDir * burstSpeed;
          state.ball.combo.mode = "burst";
          state.ball.combo.timer = 500;
          state.ball.combo.duration = 500;
          state.ball.combo.baseVy = state.ball.vy;
          state.ball.combo.travelDir = travelDir;
          state.ball.combo.speed = Math.abs(state.ball.vx);
          state.ball.combo.vfxTick = 0;
          state.ball.combo.owner = side;
          state.ball.combo.freezeBoost = !!state.events.freeze;
          state.ball.combo.curveDir = 0;
          triggerPaddleFlick(paddle, burstDir);
          spawnFlickTrail(side, burstDir);
          if (showCue) {
            const label = burstDir > 0 ? "Down Burst" : "Up Burst";
            showToast(getSideLabel(side) + " Combo: " + label);
          }
          playSfx("combo_burst");
        }

        if (isLeft) {
          state.ball.x = paddle.x + paddle.width + state.ball.radius + 2;
        } else {
          state.ball.x = paddle.x - state.ball.radius - 2;
        }

        state.ball.lastTouch = side;
        if (state.ball.charge.active && state.ball.charge.owner !== side) {
          clearBallCharge();
        }

        addPrism(side, 9, false);
        state.shake = Math.max(state.shake, 14);
        state.flash = Math.max(state.flash, 0.12);
        state.vfx.screenTint = Math.max(state.vfx.screenTint, 0.32);
        state.vfx.tintHue = state.hue % 360;

        spawnComboRainbowVfx(
          state.ball.x,
          state.ball.y,
          travelDir,
          Math.sign(state.ball.vy) || 1,
          1.85
        );

        return true;
      }

      function applyPlayerComboMove(type) {
        return applyComboMove("left", type, true);
      }

      function trackPlayerComboInput(key) {
        const now = performance.now();
        const combo = state.combo;
        combo.inputs.push({ key, at: now });

        while (combo.inputs.length && now - combo.inputs[0].at > combo.windowMs) {
          combo.inputs.shift();
        }
        while (combo.inputs.length > 10) {
          combo.inputs.shift();
        }

        if (combo.inputs.length < 4) {
          return;
        }

        const sequence = combo.inputs.slice(-4).map((entry) => entry.key).join("");
        let recognized = false;

        if (sequence === "adda") {
          recognized = true;
          queueCombo("left", "wave", "Prism Zigzag");
        } else if (sequence === "addd") {
          recognized = true;
          queueCombo("left", "burstDown", "Down Burst");
        } else if (sequence === "daaa") {
          recognized = true;
          queueCombo("left", "burstUp", "Up Burst");
        } else if (sequence === "adad") {
          recognized = true;
          queueCombo("left", "curveUp", "Curve Up");
        } else if (sequence === "dada") {
          recognized = true;
          queueCombo("left", "curveDown", "Curve Down");
        }

        if (!recognized) {
          return;
        }

        if (!state.cheats.unlockAllCombos) {
          combo.inputs.length = 0;
        }
        tryApplyBufferedCombo("left", true);
      }

      function weightedEventPick() {
        const r = Math.random();
        let sum = 0;
        for (const entry of EVENT_WEIGHTS) {
          sum += entry.weight;
          if (r <= sum) {
            return entry.name;
          }
        }
        return "large";
      }

      function scheduleNextEvent(now) {
        const config = getModeConfig();
        if (!config.eventsEnabled) {
          state.events.nextAt = Number.POSITIVE_INFINITY;
          return;
        }

        state.events.nextAt = now + rand(config.eventMinMs, config.eventMaxMs);
      }

      function showToast(message) {
        eventToast.textContent = message;
        eventToast.classList.add("show");
        clearTimeout(showToast.hideTimer);
        showToast.hideTimer = setTimeout(() => {
          eventToast.classList.remove("show");
        }, 2200);
      }

      function syncPrismMeters() {
        const left = state.prism.left;
        const right = state.prism.right;
        const cache = state.runtime.hudCache;

        const leftPct = clamp((left.value / PRISM_METER_MAX) * 100, 0, 100);
        const rightPct = clamp((right.value / PRISM_METER_MAX) * 100, 0, 100);

        const leftHeight = leftPct.toFixed(1) + "%";
        const rightHeight = rightPct.toFixed(1) + "%";
        if (cache.prismLeftHeight !== leftHeight) {
          cache.prismLeftHeight = leftHeight;
          prismMeterLeftFill.style.height = leftHeight;
        }
        if (cache.prismRightHeight !== rightHeight) {
          cache.prismRightHeight = rightHeight;
          prismMeterRightFill.style.height = rightHeight;
        }

        const rightLabel = state.settings.aiEnabled ? "AI" : "P2";
        if (cache.prismRightLabel !== rightLabel) {
          cache.prismRightLabel = rightLabel;
          prismRightLabel.textContent = rightLabel;
        }

        const leftOver = left.overexposeTimer > 0;
        const rightOver = right.overexposeTimer > 0;
        const leftShatter = left.shatterTimer > 0;
        const rightShatter = right.shatterTimer > 0;

        if (cache.leftOverexpose !== leftOver) {
          cache.leftOverexpose = leftOver;
          prismLeft.classList.toggle("overexpose", leftOver);
        }
        if (cache.rightOverexpose !== rightOver) {
          cache.rightOverexpose = rightOver;
          prismRight.classList.toggle("overexpose", rightOver);
        }
        if (cache.leftShatter !== leftShatter) {
          cache.leftShatter = leftShatter;
          prismLeft.classList.toggle("shatter", leftShatter);
        }
        if (cache.rightShatter !== rightShatter) {
          cache.rightShatter = rightShatter;
          prismRight.classList.toggle("shatter", rightShatter);
        }

        const leftReady = canActivateOverexpose("left");
        const rightReady = canActivateOverexpose("right");
        const leftText = leftOver
          ? "Overdrive " + Math.ceil(left.overexposeTimer / 1000) + "s"
          : leftReady
            ? "Ready (E)"
            : Math.round(leftPct) + "%";
        const rightText = rightOver
          ? "Overdrive " + Math.ceil(right.overexposeTimer / 1000) + "s"
          : rightReady
            ? "Ready"
            : Math.round(rightPct) + "%";

        if (cache.prismLeftText !== leftText) {
          cache.prismLeftText = leftText;
          prismMeterLeftText.textContent = leftText;
        }
        if (cache.prismRightText !== rightText) {
          cache.prismRightText = rightText;
          prismMeterRightText.textContent = rightText;
        }
      }

      function syncHud(now = performance.now(), force = false) {
        const runtime = state.runtime;
        if (!force && now < runtime.hudNextSyncAt) {
          return;
        }
        runtime.hudNextSyncAt = now + 110;

        const cache = runtime.hudCache;
        const mode = getModeConfig();

        let nextPointsLabel;
        let nextMissesLabel;
        let nextStreakLabel;
        let nextPointsValue;
        let nextMissesValue;
        let nextStreakValue;

        if (state.settings.aiEnabled) {
          nextPointsLabel = "Points";
          nextMissesLabel = "Misses";
          nextStreakLabel = "Streak";
          nextPointsValue = String(state.score.points);
          nextMissesValue = String(state.score.misses);
          nextStreakValue = String(state.score.streak);
        } else {
          nextPointsLabel = "Player 1";
          nextMissesLabel = "Player 2";
          nextStreakLabel = "Rally";
          nextPointsValue = String(state.score.player1);
          nextMissesValue = String(state.score.player2);
          nextStreakValue = String(state.score.streak);
        }

        if (cache.pointsLabel !== nextPointsLabel) {
          cache.pointsLabel = nextPointsLabel;
          pointsLabel.textContent = nextPointsLabel;
        }
        if (cache.missesLabel !== nextMissesLabel) {
          cache.missesLabel = nextMissesLabel;
          missesLabel.textContent = nextMissesLabel;
        }
        if (cache.streakLabel !== nextStreakLabel) {
          cache.streakLabel = nextStreakLabel;
          streakLabel.textContent = nextStreakLabel;
        }
        if (cache.pointsValue !== nextPointsValue) {
          cache.pointsValue = nextPointsValue;
          pointsValue.textContent = nextPointsValue;
        }
        if (cache.missesValue !== nextMissesValue) {
          cache.missesValue = nextMissesValue;
          missesValue.textContent = nextMissesValue;
        }
        if (cache.streakValue !== nextStreakValue) {
          cache.streakValue = nextStreakValue;
          streakValue.textContent = nextStreakValue;
        }

        const nextModeBadge = mode.label + " • Opponent: " + (state.settings.aiEnabled ? "AI" : "Player 2");
        if (cache.modeBadge !== nextModeBadge) {
          cache.modeBadge = nextModeBadge;
          modeBadge.textContent = nextModeBadge;
        }

        syncPrismMeters();

        let nextEventText;
        let nextEventColor;

        if (!state.events.active) {
          if (mode.survival) {
            nextEventText = "Survival " + formatTimeMs(state.survival.elapsedMs) + " • Lv " + (state.survival.level + 1);
            nextEventColor = "#ffe7a2";
          } else if (!mode.eventsEnabled) {
            nextEventText = "Duel Mode: events off";
            nextEventColor = "#c9dcff";
          } else {
            nextEventText = "None active";
            nextEventColor = "var(--text-main)";
          }
        } else {
          const refNow = state.paused && state.pauseStartedAt ? state.pauseStartedAt : now;
          const remaining = Math.max(0, (state.events.endsAt - refNow) / 1000);
          nextEventText = eventCatalog[state.events.active].label + " (" + remaining.toFixed(1) + "s)";

          if (state.events.rainbow) {
            nextEventColor = hslColor(state.hue % 360, 100, 72);
          } else if (state.events.freeze) {
            nextEventColor = "#9ad8ff";
          } else if (state.events.sticky) {
            nextEventColor = "#8ff9d7";
          } else {
            nextEventColor = "#ffd6a6";
          }
        }

        if (cache.eventValue !== nextEventText) {
          cache.eventValue = nextEventText;
          eventValue.textContent = nextEventText;
        }
        if (cache.eventColor !== nextEventColor) {
          cache.eventColor = nextEventColor;
          eventValue.style.color = nextEventColor;
        }
      }

      function clearEffects() {
        state.events.rainbow = false;
        state.events.sticky = false;
        state.events.freeze = false;
        state.events.large = false;
        state.player.height = state.player.baseHeight;
        state.ai.height = state.ai.baseHeight;
        state.ball.radius = state.ball.baseRadius;
        state.ball.sticky.attachedTo = null;
        state.ball.sticky.timer = 0;
      }

      function endCurrentEvent(now) {
        if (!state.events.active) {
          return;
        }

        const endedName = state.events.active;
        clearEffects();
        state.events.active = null;
        state.events.endsAt = 0;
        state.cheats.forcedEvent = false;
        scheduleNextEvent(now);

        spawnImpactVfx(state.width * 0.5, state.height * 0.5, 212, 0, 0, 0.9);
        playSfx("event_end");
        showToast(eventCatalog[endedName].label + " ended");
      }

      function activateEvent(name, now) {
        clearEffects();
        state.events.active = name;
        state.events.endsAt = now + eventCatalog[name].duration;

        if (name === "large") {
          state.events.large = true;
          state.ball.radius = state.ball.baseRadius * 1.82;
          state.player.height = state.player.baseHeight * 0.64;
          state.ai.height = state.ai.baseHeight * 0.64;
        }

        if (name === "rainbow") {
          state.events.rainbow = true;
        }

        if (name === "freeze") {
          state.events.freeze = true;
        }

        if (name === "sticky") {
          state.events.sticky = true;
        }

        const eventHue = name === "rainbow" ? 280 : name === "freeze" ? 202 : name === "sticky" ? 145 : 36;
        spawnShockwave(state.width * 0.5, state.height * 0.5, hslColor(eventHue, 100, 72, 0.84), 3, 160, 520);
        spawnImpactVfx(state.width * 0.5, state.height * 0.5, eventHue, rand(-0.2, 0.2), rand(-0.2, 0.2), 1.5);
        state.vfx.screenTint = Math.min(0.62, state.vfx.screenTint + 0.2);
        state.vfx.tintHue = eventHue;

        playSfx("event_start");
        showToast(eventCatalog[name].announce);
      }

      function maybeTriggerEvent(now) {
        const mode = getModeConfig();

        if (state.cheats.forcedEvent) {
          if (state.events.active && now >= state.events.endsAt) {
            endCurrentEvent(now);
          }
          return;
        }

        if (!mode.eventsEnabled) {
          if (state.events.active) {
            clearEffects();
            state.events.active = null;
            state.events.endsAt = 0;
          }
          state.events.nextAt = Number.POSITIVE_INFINITY;
          return;
        }

        if (state.events.active) {
          if (now >= state.events.endsAt) {
            endCurrentEvent(now);
          }
          return;
        }

        if (now >= state.events.nextAt) {
          activateEvent(weightedEventPick(), now);
        }
      }

      function pulseKey(which) {
        const keyEl = flickKeyMap[which];
        if (!keyEl) {
          return;
        }

        keyEl.classList.remove("active");
        void keyEl.offsetWidth;
        keyEl.classList.add("active");
        clearTimeout(keyEl.pulseTimer);
        keyEl.pulseTimer = setTimeout(() => {
          keyEl.classList.remove("active");
        }, 170);
      }

      function triggerPaddleFlick(paddle, dirSign) {
        paddle.flickTimer = FLICK_ANIM_MS;
        paddle.flickDir = dirSign;
      }

      function isBallCloseToPaddle(paddle, side) {
        const horizontalGap = side === "left"
          ? Math.abs(state.ball.x - state.ball.radius - (paddle.x + paddle.width))
          : Math.abs((state.ball.x + state.ball.radius) - paddle.x);
        const verticalGap = Math.abs(state.ball.y - (paddle.y + paddle.height * 0.5));
        return horizontalGap <= 56 && verticalGap <= paddle.height * 0.9;
      }

      function releaseStickyBall(flickDir = 0, autoRelease = false) {
        const target = state.ball.sticky.attachedTo;
        if (!target) {
          return;
        }

        const side = target === "player" ? "left" : "right";
        const direction = sideToTravelDir(side);
        const source = target === "player" ? state.player : state.ai;
        const delta = source.y - source.lastY;
        const power = getPrismShotPower(side);

        state.ball.vx = direction * clamp((Math.abs(state.ball.vx) + 80) * power, 320, getShotSpeedCap(side, 160));

        if (flickDir !== 0) {
          state.ball.vx = direction * clamp((Math.abs(state.ball.vx) + 160) * power, 460, getShotSpeedCap(side, 210));
          state.ball.vy = clamp(flickDir * (Math.abs(state.ball.vy) + 440) * power, -980, 980);
          playSfx(flickDir < 0 ? "flick_up" : "flick_down");
        } else {
          state.ball.vy = clamp(delta * 14 + rand(-150, 150), -520, 520);
        }

        const releaseX = target === "player" ? source.x + source.width + 6 : source.x - 6;
        const releaseY = source.y + source.height * 0.5;
        spawnImpactVfx(releaseX, releaseY, 146, direction, flickDir * 0.55, 0.95);

        state.ball.sticky.attachedTo = null;
        state.ball.sticky.timer = 0;
        state.ball.lastTouch = side;

        if (state.ball.charge.active && state.ball.charge.owner !== side) {
          clearBallCharge();
        }

        if (!autoRelease || flickDir !== 0) {
          playSfx("sticky_release");
        }
      }

      function tryFlick(side, dirSign) {
        if (state.paused || state.ball.respawnTimer > 0) {
          return;
        }

        const paddle = side === "left" ? state.player : state.ai;
        const attachedToThis = state.ball.sticky.attachedTo === (side === "left" ? "player" : "ai");

        triggerPaddleFlick(paddle, dirSign);
        spawnFlickTrail(side, dirSign);

        const closeNow = isBallCloseToPaddle(paddle, side);
        if (closeNow || attachedToThis) {
          if (side === "left") {
            state.flick.leftLastAt = performance.now();
          } else {
            state.flick.rightLastAt = performance.now();
          }
        }

        if (attachedToThis) {
          releaseStickyBall(dirSign, false);
          return;
        }

        if (!closeNow) {
          return;
        }

        const travelDir = sideToTravelDir(side);
        const shotPower = getPrismShotPower(side);
        const flickSpeed = clamp((Math.hypot(state.ball.vx, state.ball.vy) + 220) * shotPower, 420, getShotSpeedCap(side, 220));

        state.ball.vx = travelDir * flickSpeed * 0.82;
        state.ball.vy = clamp(dirSign * flickSpeed, -980, 980);

        if (side === "left") {
          state.ball.x = paddle.x + paddle.width + state.ball.radius + 1;
        } else {
          state.ball.x = paddle.x - state.ball.radius - 1;
        }

        state.ball.lastTouch = side;
        if (state.ball.charge.active && state.ball.charge.owner !== side) {
          clearBallCharge();
        }

        addPrism(side, 2, false);
        state.shake = Math.max(state.shake, 7);
        playSfx(dirSign < 0 ? "flick_up" : "flick_down");
      }

      function attachBallToPaddle(target) {
        state.ball.sticky.attachedTo = target;
        state.ball.sticky.timer = 950;

        const source = target === "player" ? state.player : state.ai;
        const x = target === "player" ? source.x + source.width + 4 : source.x - 4;
        const y = source.y + source.height * 0.5;
        spawnImpactVfx(x, y, 145, target === "player" ? 1 : -1, 0, 0.7);
        playSfx("sticky_attach");
      }

      function registerReturn(side) {
        state.score.streak += 1;
        addPrism(side, state.events.freeze ? 8 : 6, false);

        if (!state.settings.aiEnabled || side !== "left") {
          return;
        }

        const base = state.events.rainbow ? 2 : 1;
        const gain = scoreWithPrism(base, "left", true);
        state.score.points += gain;

        if (state.events.rainbow && state.score.misses > 0) {
          state.score.misses -= 1;
        }
      }

      function respawnBall(direction) {
        refreshBallMaxSpeed();

        state.ball.x = state.width * 0.5;
        state.ball.y = state.height * 0.5;
        const speed = 340 * getSurvivalSpeedMultiplier();
        state.ball.vx = direction * speed;
        state.ball.vy = rand(-180, 180);
        state.ball.respawnTimer = 700;
        state.ball.sticky.attachedTo = null;
        state.ball.sticky.timer = 0;
        state.ball.trail.length = 0;
        state.ball.lastTouch = null;
        clearBallCombo();
        clearBallCharge();
      }

      function resetMatch() {
        recordScoreLogIfNeeded("reset");

        state.score.points = 0;
        state.score.misses = 0;
        state.score.streak = 0;
        state.score.player1 = 0;
        state.score.player2 = 0;
        state.flash = 0;
        state.shake = 0;

        clearEffects();
        state.events.active = null;
        state.events.endsAt = 0;
        scheduleNextEvent(performance.now() + 1200);

        state.player.height = state.player.baseHeight;
        state.ai.height = state.ai.baseHeight;
        state.player.y = state.height * 0.5 - state.player.height * 0.5;
        state.ai.y = state.height * 0.5 - state.ai.height * 0.5;
        state.player.speed = state.player.baseSpeed;
        state.ai.speed = state.ai.baseSpeed;
        state.ai.manualSpeed = state.ai.baseManualSpeed;

        state.player.flickTimer = 0;
        state.ai.flickTimer = 0;
        state.ai.actionCooldownUntil = 0;
        state.ai.aimOffset = 0;
        state.ai.aimRefreshAt = 0;
        state.ai.confusedUntil = 0;

        state.prism.left.value = 0;
        state.prism.left.overexposeTimer = 0;
        state.prism.left.shatterTimer = 0;
        state.prism.right.value = 0;
        state.prism.right.overexposeTimer = 0;
        state.prism.right.shatterTimer = 0;
        applyBarMaxCheats();

        state.vfx.particles.length = 0;
        state.vfx.shockwaves.length = 0;
        state.vfx.flickArrows.length = 0;
        state.vfx.screenTint = 0;
        state.vfx.scorePulse = 0;
        state.combo.inputs.length = 0;
        state.combo.pending.left = null;
        state.combo.pending.right = null;
        state.cheats.comboQueue.left.length = 0;
        state.cheats.comboQueue.right.length = 0;
        state.cheats.forcedEvent = false;
        state.cheats.leftAi.aimOffset = 0;
        state.cheats.leftAi.aimRefreshAt = 0;
        state.cheats.leftAi.actionCooldownUntil = 0;
        state.cheats.leftAi.confusedUntil = 0;

        state.flick.leftLastAt = -1;
        state.flick.rightLastAt = -1;

        state.runtime.frameMsEMA = 16.7;
        state.runtime.lagDetected = false;
        state.runtime.lagHoldUntil = 0;
        state.runtime.frameId = 0;
        state.runtime.aiAdaptiveBias = 0;
        state.runtime.vfxLimiter.budgetFrameId = -1;
        state.runtime.vfxLimiter.generalBudget = 0;
        state.runtime.vfxLimiter.flickBudget = 0;

        resetSurvivalState();

        state.ball.radius = state.ball.baseRadius;
        respawnBall(Math.random() > 0.5 ? 1 : -1);
        state.runtime.hudNextSyncAt = 0;
        syncHud(performance.now(), true);
        showToast("Match reset");
      }

      function resize() {
        const tier = getPerformanceTier();
        const safariLike = state.runtime.compatibility.isSafariLike;
        const baseCap = tier === 2 ? 1 : tier === 1 ? 1.28 : (safariLike ? 1.45 : 1.75);
        const dprCap = baseCap * state.runtime.dynamicDprScale;
        const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, dprCap));
        const bounds = canvas.getBoundingClientRect();
        const width = Math.max(1, Math.round(bounds.width));
        const height = Math.max(1, Math.round(bounds.height));

        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        state.width = width;
        state.height = height;

        state.player.x = 24;
        state.ai.x = state.width - state.ai.width - 24;

        state.player.y = clamp(state.player.y, 0, state.height - state.player.height);
        state.ai.y = clamp(state.ai.y, 0, state.height - state.ai.height);
        state.ball.x = clamp(state.ball.x, state.ball.radius + 8, state.width - state.ball.radius - 8);
        state.ball.y = clamp(state.ball.y, state.ball.radius + 8, state.height - state.ball.radius - 8);
      }

      function updatePlayer(dt) {
        if (state.cheats.aiVsAi) {
          updateLeftAi(dt);
          return;
        }

        state.player.lastY = state.player.y;

        const moveSpeed = state.player.baseSpeed * getOpponentSlowFactor("left");

        if (state.settings.pointerAssist && state.input.pointerActive && state.input.pointerY !== null) {
          const targetY = clamp(state.input.pointerY - state.player.height * 0.5, 0, state.height - state.player.height);
          const followRate = clamp(dt * 12, 0, 1);
          state.player.y += (targetY - state.player.y) * followRate;
        }

        if (state.input.p1Up) {
          state.player.y -= moveSpeed * dt;
        }
        if (state.input.p1Down) {
          state.player.y += moveSpeed * dt;
        }

        state.player.y = clamp(state.player.y, 0, state.height - state.player.height);
      }

      function projectBallYAtTime(y, vy, timeSec) {
        if (timeSec <= 0) {
          return y;
        }

        const minY = state.ball.radius;
        const maxY = state.height - state.ball.radius;
        const span = Math.max(1, maxY - minY);
        const period = span * 2;

        let normalized = (y + vy * timeSec) - minY;
        normalized = ((normalized % period) + period) % period;
        if (normalized > span) {
          normalized = period - normalized;
        }

        return minY + normalized;
      }

      function runLeftAiShotDecision(now) {
        if (state.paused || state.ball.respawnTimer > 0) {
          return;
        }

        const brain = state.cheats.leftAi;
        if (now < brain.actionCooldownUntil) {
          return;
        }

        const stickyAttached = state.ball.sticky.attachedTo === "player";
        const closeToBall = isBallCloseToPaddle(state.player, "left");
        const incoming = state.ball.vx < -70 || stickyAttached;
        const difficulty = getAdaptiveAiDifficultyFactor("left");
        maybeTriggerAiConfusion("left", brain, difficulty, now);
        const confused = now < brain.confusedUntil;

        if (canActivateOverexpose("left")) {
          const triggerChance = 0.16 + difficulty * 0.55;
          if (Math.random() < triggerChance) {
            activateOverexpose("left", true);
            brain.actionCooldownUntil = now + rand(220, 420);
            return;
          }
        }

        if (!incoming || (!closeToBall && !stickyAttached)) {
          return;
        }

        const centerDelta = state.ball.y - (state.player.y + state.player.height * 0.5);
        const threshold = lerp(16, 6, difficulty);
        let dirSign;
        if (centerDelta < -threshold) {
          dirSign = -1;
        } else if (centerDelta > threshold) {
          dirSign = 1;
        } else {
          const followCenterChance = lerp(0.4, 0.92, difficulty);
          if (Math.random() < followCenterChance) {
            dirSign = centerDelta === 0 ? (Math.random() < 0.5 ? -1 : 1) : (centerDelta < 0 ? -1 : 1);
          } else {
            dirSign = Math.random() < 0.5 ? -1 : 1;
          }
        }

        const speed = Math.hypot(state.ball.vx, state.ball.vy);
        const mode = getModeConfig();
        let comboChance = state.runtime.lagDetected ? 0.14 : (speed > 560 ? 0.56 : 0.38);
        if (state.settings.gameMode === "chaos") {
          comboChance += 0.08;
        }
        if (!mode.eventsEnabled) {
          comboChance += 0.04;
        }
        comboChance += lerp(-0.12, 0.18, difficulty);
        comboChance = clamp(comboChance, 0.08, 0.9);

        let reactionChance = lerp(0.56, 0.98, difficulty);
        if (confused) {
          comboChance *= 0.56;
          reactionChance *= 0.72;
        }

        if (Math.random() > reactionChance) {
          brain.actionCooldownUntil = now + rand(180, 330);
          return;
        }

        let acted = false;

        if (Math.random() < comboChance) {
          let comboType;
          if (Math.abs(centerDelta) < state.player.height * 0.18) {
            comboType = "wave";
          } else if (Math.random() < 0.22) {
            comboType = dirSign < 0 ? "curveUp" : "curveDown";
          } else {
            comboType = dirSign < 0 ? "burstUp" : "burstDown";
          }
          acted = applyComboMove("left", comboType, true);
        }

        if (!acted) {
          tryFlick("left", dirSign);
          brain.actionCooldownUntil = now + rand(lerp(260, 130, difficulty), lerp(420, 250, difficulty));
          return;
        }

        brain.actionCooldownUntil = now + rand(lerp(540, 300, difficulty), lerp(780, 520, difficulty));
      }

      function updateLeftAi(dt) {
        const now = performance.now();
        state.player.lastY = state.player.y;

        const center = state.player.y + state.player.height * 0.5;
        const movingTowardPlayer = state.ball.vx < -20 || state.ball.sticky.attachedTo === "player";
        const difficulty = getAdaptiveAiDifficultyFactor("left");
        const leftAi = state.cheats.leftAi;

        if (now >= leftAi.aimRefreshAt) {
          const maxError = lerp(86, 8, difficulty);
          leftAi.aimOffset = rand(-maxError, maxError);
          leftAi.aimRefreshAt = now + lerp(520, 120, difficulty);
        }
        maybeTriggerAiConfusion("left", leftAi, difficulty, now);
        const confused = now < leftAi.confusedUntil;

        let targetY;
        if (movingTowardPlayer && state.ball.vx < -20) {
          const interceptX = state.player.x + state.player.width + state.ball.radius + 2;
          const timeToIntercept = (interceptX - state.ball.x) / state.ball.vx;
          targetY = timeToIntercept > 0
            ? projectBallYAtTime(state.ball.y, state.ball.vy, timeToIntercept)
            : state.ball.y;
        } else {
          targetY = state.height * 0.5 + Math.sin(now * 0.0026) * 16;
        }

        targetY = targetY + leftAi.aimOffset;
        if (confused) {
          targetY += Math.sin(now * 0.024) * state.player.height * 0.28;
        }
        targetY = clamp(targetY, state.ball.radius, state.height - state.ball.radius);

        let moveScale = movingTowardPlayer ? lerp(0.78, 1.22, difficulty) : lerp(0.6, 0.9, difficulty);
        if (confused) {
          moveScale *= 0.74;
        }
        const moveSpeed = state.player.baseSpeed * getOpponentSlowFactor("left");
        const maxStep = moveSpeed * moveScale * dt;
        const delta = targetY - center;
        const deadZone = lerp(18, 4, difficulty);
        const step = Math.abs(delta) <= deadZone ? 0 : clamp(delta, -maxStep, maxStep);

        state.player.y += step;
        state.player.y = clamp(state.player.y, 0, state.height - state.player.height);

        runLeftAiShotDecision(now);
      }

      function runAiShotDecision(now) {
        if (state.paused || state.ball.respawnTimer > 0) {
          return;
        }

        const brain = state.ai;
        if (now < state.ai.actionCooldownUntil) {
          return;
        }

        const stickyAttached = state.ball.sticky.attachedTo === "ai";
        const closeToBall = isBallCloseToPaddle(state.ai, "right");
        const incoming = state.ball.vx > 70 || stickyAttached;
        const difficulty = getAdaptiveAiDifficultyFactor("right");
        maybeTriggerAiConfusion("right", brain, difficulty, now);
        const confused = now < brain.confusedUntil;

        if (canActivateOverexpose("right")) {
          const triggerChance = 0.16 + difficulty * 0.55;
          if (Math.random() < triggerChance) {
            activateOverexpose("right", true);
            state.ai.actionCooldownUntil = now + rand(220, 420);
            return;
          }
        }

        if (!incoming || (!closeToBall && !stickyAttached)) {
          return;
        }

        const centerDelta = state.ball.y - (state.ai.y + state.ai.height * 0.5);
        const threshold = lerp(16, 6, difficulty);
        let dirSign;
        if (centerDelta < -threshold) {
          dirSign = -1;
        } else if (centerDelta > threshold) {
          dirSign = 1;
        } else {
          const followCenterChance = lerp(0.4, 0.92, difficulty);
          if (Math.random() < followCenterChance) {
            dirSign = centerDelta === 0 ? (Math.random() < 0.5 ? -1 : 1) : (centerDelta < 0 ? -1 : 1);
          } else {
            dirSign = Math.random() < 0.5 ? -1 : 1;
          }
        }

        const speed = Math.hypot(state.ball.vx, state.ball.vy);
        const mode = getModeConfig();
        let comboChance = state.runtime.lagDetected ? 0.14 : (speed > 560 ? 0.56 : 0.38);
        if (state.settings.gameMode === "chaos") {
          comboChance += 0.08;
        }
        if (!mode.eventsEnabled) {
          comboChance += 0.04;
        }
        comboChance += lerp(-0.12, 0.18, difficulty);
        comboChance = clamp(comboChance, 0.08, 0.9);

        let reactionChance = lerp(0.56, 0.98, difficulty);
        if (confused) {
          comboChance *= 0.56;
          reactionChance *= 0.72;
        }

        if (Math.random() > reactionChance) {
          state.ai.actionCooldownUntil = now + rand(180, 330);
          return;
        }

        let acted = false;

        if (Math.random() < comboChance) {
          let comboType;
          if (Math.abs(centerDelta) < state.ai.height * 0.18) {
            comboType = "wave";
          } else if (Math.random() < 0.22) {
            comboType = dirSign < 0 ? "curveUp" : "curveDown";
          } else {
            comboType = dirSign < 0 ? "burstUp" : "burstDown";
          }
          acted = applyComboMove("right", comboType, true);
        }

        if (!acted) {
          tryFlick("right", dirSign);
          state.ai.actionCooldownUntil = now + rand(lerp(260, 130, difficulty), lerp(420, 250, difficulty));
          return;
        }

        state.ai.actionCooldownUntil = now + rand(lerp(540, 300, difficulty), lerp(780, 520, difficulty));
      }

      function updateAi(dt) {
        const now = performance.now();
        state.ai.lastY = state.ai.y;

        const center = state.ai.y + state.ai.height * 0.5;
        const movingTowardAi = state.ball.vx > 20 || state.ball.sticky.attachedTo === "ai";
        const difficulty = getAdaptiveAiDifficultyFactor("right");

        if (now >= state.ai.aimRefreshAt) {
          const maxError = lerp(86, 8, difficulty);
          state.ai.aimOffset = rand(-maxError, maxError);
          state.ai.aimRefreshAt = now + lerp(520, 120, difficulty);
        }
        maybeTriggerAiConfusion("right", state.ai, difficulty, now);
        const confused = now < state.ai.confusedUntil;

        let targetY;
        if (movingTowardAi && state.ball.vx > 20) {
          const interceptX = state.ai.x - state.ball.radius - 2;
          const timeToIntercept = (interceptX - state.ball.x) / state.ball.vx;
          targetY = timeToIntercept > 0
            ? projectBallYAtTime(state.ball.y, state.ball.vy, timeToIntercept)
            : state.ball.y;
        } else {
          targetY = state.height * 0.5 + Math.sin(now * 0.0024) * 16;
        }

        targetY = targetY + state.ai.aimOffset;
        if (confused) {
          targetY += Math.sin(now * 0.024) * state.ai.height * 0.28;
        }
        targetY = clamp(targetY, state.ball.radius, state.height - state.ball.radius);

        let moveScale = movingTowardAi ? lerp(0.78, 1.22, difficulty) : lerp(0.6, 0.9, difficulty);
        if (confused) {
          moveScale *= 0.74;
        }
        const aiSpeed = state.ai.baseSpeed * getOpponentSlowFactor("right");
        const maxStep = aiSpeed * moveScale * dt;
        const delta = targetY - center;
        const deadZone = lerp(18, 4, difficulty);
        const step = Math.abs(delta) <= deadZone ? 0 : clamp(delta, -maxStep, maxStep);

        state.ai.y += step;
        state.ai.y = clamp(state.ai.y, 0, state.height - state.ai.height);

        runAiShotDecision(now);
      }

      function updateManualP2(dt) {
        state.ai.lastY = state.ai.y;

        const moveSpeed = state.ai.baseManualSpeed * getOpponentSlowFactor("right");

        if (state.input.p2Up) {
          state.ai.y -= moveSpeed * dt;
        }
        if (state.input.p2Down) {
          state.ai.y += moveSpeed * dt;
        }

        state.ai.y = clamp(state.ai.y, 0, state.height - state.ai.height);
      }

      function updateSecondPaddle(dt) {
        if (state.settings.aiEnabled) {
          updateAi(dt);
          return;
        }
        updateManualP2(dt);
      }

      function handleWallBounce() {
        if (state.ball.y - state.ball.radius <= 0 && state.ball.vy < 0) {
          state.ball.y = state.ball.radius;
          state.ball.vy *= -1;
          spawnImpactVfx(clamp(state.ball.x, 18, state.width - 18), state.ball.radius, 204, 0, 0.8, 0.8);
          playSfx("wall");
        }

        if (state.ball.y + state.ball.radius >= state.height && state.ball.vy > 0) {
          state.ball.y = state.height - state.ball.radius;
          state.ball.vy *= -1;
          spawnImpactVfx(clamp(state.ball.x, 18, state.width - 18), state.height - state.ball.radius, 204, 0, -0.8, 0.8);
          playSfx("wall");
        }
      }

      function paddleCollision(paddle, side) {
        const withinY = state.ball.y + state.ball.radius >= paddle.y && state.ball.y - state.ball.radius <= paddle.y + paddle.height;
        if (!withinY) {
          return false;
        }

        if (side === "left") {
          const overlap = state.ball.x - state.ball.radius <= paddle.x + paddle.width;
          if (!overlap || state.ball.vx >= 0) {
            return false;
          }
        } else {
          const overlap = state.ball.x + state.ball.radius >= paddle.x;
          if (!overlap || state.ball.vx <= 0) {
            return false;
          }
        }

        return true;
      }

      function resolvePaddleBounce(paddle, side) {
        clearBallCombo();

        const paddleCenter = paddle.y + paddle.height * 0.5;
        const normalized = clamp((state.ball.y - paddleCenter) / (paddle.height * 0.5), -1, 1);
        const shotPower = getPrismShotPower(side);
        const speed = clamp((Math.hypot(state.ball.vx, state.ball.vy) + 24) * shotPower, 330, getShotSpeedCap(side, 80));

        const horizontal = Math.cos(normalized * 0.95);
        const vertical = Math.sin(normalized * 1.15);

        state.ball.vx = sideToTravelDir(side) * speed * Math.max(0.42, horizontal);
        state.ball.vy = speed * vertical + (paddle.y - paddle.lastY) * 10;

        const now = performance.now();
        const flickStamp = side === "left" ? state.flick.leftLastAt : state.flick.rightLastAt;
        const perfectFlick = flickStamp > 0 && now - flickStamp <= PERFECT_FLICK_WINDOW_MS;

        if (perfectFlick) {
          armPerfectCharge(side);
        } else if (state.ball.charge.active && state.ball.charge.owner !== side) {
          clearBallCharge();
        }

        if (side === "left") {
          state.ball.x = paddle.x + paddle.width + state.ball.radius;
        } else {
          state.ball.x = paddle.x - state.ball.radius;
        }

        state.ball.lastTouch = side;
        registerReturn(side);

        const impactX = side === "left" ? paddle.x + paddle.width + 4 : paddle.x - 4;
        spawnImpactVfx(impactX, state.ball.y, side === "left" ? 198 : 156, sideToTravelDir(side), normalized * 0.9, perfectFlick ? 1.38 : 1.1);

        if (state.events.sticky) {
          attachBallToPaddle(side === "left" ? "player" : "ai");
        }

        addPrism(side, perfectFlick ? 12 : 7, false);
        playSfx("hit");
      }

      function recoverBallForGodmode(side) {
        clearBallCombo();
        clearBallCharge();
        state.ball.sticky.attachedTo = null;
        state.ball.sticky.timer = 0;
        state.ball.respawnTimer = 0;
        state.score.streak = 0;

        if (side === "left") {
          state.ball.x = state.player.x + state.player.width + state.ball.radius + 4;
          state.ball.vx = Math.max(340, Math.abs(state.ball.vx || 340));
        } else {
          state.ball.x = state.ai.x - state.ball.radius - 4;
          state.ball.vx = -Math.max(340, Math.abs(state.ball.vx || 340));
        }

        state.ball.y = clamp(state.ball.y, state.ball.radius, state.height - state.ball.radius);
        state.ball.vy = clamp(state.ball.vy + rand(-120, 120), -640, 640);
        state.ball.lastTouch = side;
        state.shake = Math.max(state.shake, 4);
        showToast(getSideLabel(side) + " godmode saved the point");
      }

      function handleScoring() {
        if (state.ball.x + state.ball.radius < 0) {
          if (state.cheats.godmode.left) {
            recoverBallForGodmode("left");
            return;
          }

          const gain = scoreWithPrism(1, "right", true);
          state.score.player2 += gain;
          state.score.streak = 0;
          clearBallCombo();
          clearBallCharge();
          shatterPrism("left");

          if (state.settings.aiEnabled) {
            state.score.misses += 1;
            if (getModeConfig().survival) {
              const survived = formatTimeMs(state.survival.elapsedMs);
              showToast("Missed return • survived " + survived);
              resetSurvivalState();
            } else {
              showToast("Missed return");
            }
          } else {
            showToast("Player 2 scored +" + gain);
          }

          state.flash = 0.25;
          state.shake = 10;
          spawnGoalVfx("left");
          respawnBall(1);
          playSfx("miss");
          return;
        }

        if (state.ball.x - state.ball.radius > state.width) {
          if (state.cheats.godmode.right) {
            recoverBallForGodmode("right");
            return;
          }

          const base = state.settings.aiEnabled ? (state.events.rainbow ? 6 : 3) : 1;
          const gain = scoreWithPrism(base, "left", true);

          if (state.settings.aiEnabled) {
            state.score.points += gain;
            state.score.player1 += 1;
            showToast("You scored past the AI +" + gain);
          } else {
            state.score.player1 += gain;
            showToast("Player 1 scored +" + gain);
          }

          state.score.streak = 0;
          clearBallCombo();
          clearBallCharge();
          shatterPrism("right");

          state.shake = 6;
          spawnGoalVfx("right");
          respawnBall(-1);
          playSfx("score");
        }
      }

      function updateBall(dt) {
        if (state.ball.respawnTimer > 0) {
          state.ball.respawnTimer -= dt * 1000;
          return;
        }

        const now = performance.now();
        pruneComboBuffers(now);
        tryApplyBufferedCombo("left", true);
        tryApplyBufferedCombo("right", false);

        if (state.ball.sticky.attachedTo) {
          const side = state.ball.sticky.attachedTo === "player" ? "left" : "right";
          tryApplyBufferedCombo(side, true);

          if (state.ball.sticky.attachedTo) {
            const anchor = side === "left" ? state.player : state.ai;
            const dir = sideToTravelDir(side);
            state.ball.x = anchor.x + (dir === 1 ? anchor.width + state.ball.radius : -state.ball.radius);
            state.ball.y = anchor.y + anchor.height * 0.5;
            state.ball.sticky.timer -= dt * 1000;
            if (state.ball.sticky.timer <= 0 || !state.events.sticky) {
              releaseStickyBall(0, true);
            }
            return;
          }
        }

        const ballDt = dt * (state.events.freeze ? FREEZE_SLOW_FACTOR : 1);

        if (state.ball.combo.mode) {
          const combo = state.ball.combo;
          combo.timer -= ballDt * 1000;

          if (combo.timer <= 0) {
            clearBallCombo();
          } else {
            if (combo.mode === "wave") {
              const progress = 1 - combo.timer / combo.duration;
              const wave = Math.sin(progress * Math.PI * 2.9 - Math.PI / 2);
              state.ball.vy = clamp(combo.baseVy + wave * 940, -1260, 1260);
            } else if (combo.mode === "curve") {
              const progress = 1 - combo.timer / combo.duration;
              const eased = progress * progress * (3 - 2 * progress);
              const curveVy = combo.baseVy * eased;
              state.ball.vy = clamp(curveVy, -1260, 1260);
            } else {
              const minBurstVy = Math.abs(combo.baseVy) * 0.9;
              state.ball.vy *= Math.pow(0.992, ballDt * 60);
              if (Math.abs(state.ball.vy) < minBurstVy) {
                state.ball.vy = Math.sign(combo.baseVy || 1) * minBurstVy;
              }
            }

            state.ball.vx = combo.travelDir * Math.max(Math.abs(state.ball.vx), combo.speed);

            combo.vfxTick -= ballDt * 1000;
            if (combo.vfxTick <= 0) {
              combo.vfxTick = getPerformanceTier() === 0 ? 14 : 26;
              spawnComboRainbowVfx(
                state.ball.x,
                state.ball.y,
                combo.travelDir,
                Math.sign(state.ball.vy) || 1,
                combo.freezeBoost ? 1.18 : 1.05
              );
            }
          }
        }

        state.ball.x += state.ball.vx * ballDt;
        state.ball.y += state.ball.vy * ballDt;

        const tier = getPerformanceTier();
        const trailSpawnChance = tier === 2 ? 0.34 : tier === 1 ? 0.72 : 1;
        if (Math.random() <= trailSpawnChance) {
          const owner = state.ball.charge.active ? state.ball.charge.owner : state.ball.lastTouch;
          const ownerOverexposed = owner && state.prism[owner].overexposeTimer > 0;
          const trailHue = state.ball.charge.active
            ? 42 + rand(-10, 10)
            : ownerOverexposed
              ? (owner === "left" ? 194 + rand(-12, 12) : 148 + rand(-12, 12))
              : null;

          state.ball.trail.push({
            x: state.ball.x,
            y: state.ball.y,
            r: state.ball.radius,
            a: tier === 2 ? 0.19 : tier === 1 ? 0.24 : 0.28,
            hue: trailHue
          });
        }

        const trailLimit = getTrailLimit();
        if (state.ball.trail.length > trailLimit) {
          state.ball.trail.shift();
        }

        handleWallBounce();

        if (paddleCollision(state.player, "left")) {
          resolvePaddleBounce(state.player, "left");
        } else if (paddleCollision(state.ai, "right")) {
          resolvePaddleBounce(state.ai, "right");
        }

        handleScoring();
      }

      function updateEffects(dt) {
        state.hue += dt * 180;
        if (state.hue > 360) {
          state.hue -= 360;
        }

        if (state.flash > 0) {
          state.flash = Math.max(0, state.flash - dt * 1.5);
        }

        if (state.shake > 0) {
          state.shake = Math.max(0, state.shake - dt * 20);
        }

        if (state.player.flickTimer > 0) {
          state.player.flickTimer = Math.max(0, state.player.flickTimer - dt * 1000);
        }
        if (state.ai.flickTimer > 0) {
          state.ai.flickTimer = Math.max(0, state.ai.flickTimer - dt * 1000);
        }

        if (state.ball.charge.active) {
          state.ball.charge.timer -= dt * 1000;
          if (state.ball.charge.timer <= 0) {
            clearBallCharge();
          }
        }

        for (const side of ["left", "right"]) {
          const meter = state.prism[side];

          if (meter.overexposeTimer > 0) {
            meter.overexposeTimer = Math.max(0, meter.overexposeTimer - dt * 1000);
            if (meter.overexposeTimer <= 0) {
              showToast(getSideLabel(side) + " Overexpose faded");
              playSfx("overexpose_end");
            }
          }

          if (meter.shatterTimer > 0) {
            meter.shatterTimer = Math.max(0, meter.shatterTimer - dt * 1000);
          }
        }

        for (const trail of state.ball.trail) {
          const fadeRate = trail.hue !== null && trail.hue !== undefined ? 0.58 : 0.75;
          trail.a = Math.max(0, trail.a - dt * fadeRate);
        }

        for (let i = state.vfx.particles.length - 1; i >= 0; i -= 1) {
          const p = state.vfx.particles[i];
          p.life -= dt * 1000;
          if (p.life <= 0) {
            state.vfx.particles.splice(i, 1);
            continue;
          }

          p.x += p.vx * dt;
          p.y += p.vy * dt;

          const dragFactor = Math.max(0, 1 - p.drag * dt);
          p.vx *= dragFactor;
          p.vy *= dragFactor;
        }

        for (let i = state.vfx.shockwaves.length - 1; i >= 0; i -= 1) {
          const wave = state.vfx.shockwaves[i];
          wave.life -= dt * 1000;
          if (wave.life <= 0) {
            state.vfx.shockwaves.splice(i, 1);
            continue;
          }

          const progress = 1 - wave.life / wave.maxLife;
          wave.r = 8 + (wave.maxRadius - 8) * progress;
        }

        for (let i = state.vfx.flickArrows.length - 1; i >= 0; i -= 1) {
          const arrow = state.vfx.flickArrows[i];
          arrow.life -= dt * 1000;
          if (arrow.life <= 0) {
            state.vfx.flickArrows.splice(i, 1);
            continue;
          }

          arrow.x += arrow.vx * dt;
          arrow.y += arrow.vy * dt;
        }

        state.vfx.screenTint = Math.max(0, state.vfx.screenTint - dt * 0.55);
        state.vfx.scorePulse = Math.max(0, state.vfx.scorePulse - dt * 1.2);
      }

      function drawBoard() {
        ctx.clearRect(0, 0, state.width, state.height);

        const tier = getPerformanceTier();
        if (tier >= 1) {
          ctx.fillStyle = "#0b1831";
          ctx.fillRect(0, 0, state.width, state.height);

          ctx.strokeStyle = "#3a5278";
          ctx.lineWidth = 2;
          ctx.strokeRect(2, 2, state.width - 4, state.height - 4);

          ctx.strokeStyle = "#2d405f";
          ctx.setLineDash([7, 10]);
          ctx.beginPath();
          ctx.moveTo(state.width * 0.5, 12);
          ctx.lineTo(state.width * 0.5, state.height - 12);
          ctx.stroke();
          ctx.setLineDash([]);
          return;
        }

        const g = ctx.createLinearGradient(0, 0, 0, state.height);
        g.addColorStop(0, "rgba(14, 28, 51, 0.74)");
        g.addColorStop(1, "rgba(5, 10, 21, 0.95)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, state.width, state.height);

        ctx.save();
        if (state.events.rainbow) {
          const border = ctx.createLinearGradient(0, 0, state.width, state.height);
          border.addColorStop(0, `hsl(${(state.hue + 20) % 360} 100% 66%)`);
          border.addColorStop(0.5, `hsl(${(state.hue + 160) % 360} 100% 66%)`);
          border.addColorStop(1, `hsl(${(state.hue + 300) % 360} 100% 66%)`);
          ctx.strokeStyle = border;
          ctx.lineWidth = 4;
        } else {
          ctx.strokeStyle = "rgba(190, 220, 255, 0.28)";
          ctx.lineWidth = 2;
        }
        ctx.strokeRect(2, 2, state.width - 4, state.height - 4);
        ctx.restore();

        ctx.strokeStyle = "rgba(210, 230, 255, 0.2)";
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 10]);
        ctx.beginPath();
        ctx.moveTo(state.width * 0.5, 12);
        ctx.lineTo(state.width * 0.5, state.height - 12);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      function drawPaddle(paddle, color1, color2) {
        const flickProgress = paddle.flickTimer > 0 ? 1 - paddle.flickTimer / FLICK_ANIM_MS : 0;
        const flickPulse = flickProgress > 0 ? Math.sin(flickProgress * Math.PI) : 0;
        const tier = getPerformanceTier();

        const isLeftPaddle = paddle.x < state.width * 0.5;
        const forwardSign = isLeftPaddle ? 1 : -1;
        const flickYOffset = paddle.flickDir * flickPulse * 18;
        const flickXOffset = forwardSign * flickPulse * 8;
        const flickAngle = forwardSign * paddle.flickDir * flickPulse * 0.24;

        const width = paddle.width;
        const height = paddle.height;
        const x = paddle.x + flickXOffset;
        const y = paddle.y + flickYOffset;
        const cx = x + width * 0.5;
        const cy = y + height * 0.5;

        if (flickPulse > 0.03 && tier === 0) {
          const ghostAlpha = 0.08 + flickPulse * 0.2;
          ctx.save();
          ctx.translate(cx - forwardSign * 6, cy - paddle.flickDir * 6);
          ctx.rotate(flickAngle * 0.5);
          ctx.fillStyle = "rgba(157, 222, 255, " + ghostAlpha + ")";
          ctx.fillRect(-width * 0.5, -height * 0.5, width, height);
          ctx.restore();
        }

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(flickAngle);

        const grad = ctx.createLinearGradient(-width * 0.5, -height * 0.5, width * 0.5, height * 0.5);
        grad.addColorStop(0, color1);
        grad.addColorStop(1, color2);

        ctx.fillStyle = grad;
        ctx.shadowColor = "rgba(161, 220, 255, 0.35)";
        ctx.shadowBlur = tier === 0 ? 14 : 0;
        ctx.fillRect(-width * 0.5, -height * 0.5, width, height);

        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
        ctx.fillRect(-width * 0.5 + 1, -height * 0.5 + 2, width - 2, 5);

        if (flickPulse > 0.02) {
          ctx.strokeStyle = "rgba(158, 224, 255, " + (0.28 + flickPulse * 0.5) + ")";
          ctx.lineWidth = 2.1 + flickPulse * 0.7;
          ctx.strokeRect(-width * 0.5 - 3, -height * 0.5 - 3, width + 6, height + 6);
        }

        if (state.events.sticky) {
          ctx.strokeStyle = "rgba(132, 248, 206, 0.65)";
          ctx.lineWidth = 2;
          ctx.strokeRect(-width * 0.5 - 2, -height * 0.5 - 2, width + 4, height + 4);
        }

        ctx.restore();
      }

      function drawBall() {
        const tier = getPerformanceTier();
        const trailStep = tier === 2 ? 3 : tier === 1 ? 2 : 1;

        for (let i = 0; i < state.ball.trail.length; i += trailStep) {
          const trail = state.ball.trail[i];
          if (trail.a <= 0) {
            continue;
          }

          ctx.beginPath();
          if (trail.hue !== null && trail.hue !== undefined) {
            ctx.fillStyle = hslColor(trail.hue, 100, 70, trail.a);
          } else if (state.events.rainbow) {
            ctx.fillStyle = hslColor((state.hue - trail.r * 8) % 360, 100, 66, trail.a);
          } else {
            ctx.fillStyle = "rgba(194, 228, 255, " + trail.a + ")";
          }

          ctx.arc(trail.x, trail.y, trail.r * 0.95, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        if (state.ball.charge.active) {
          const chargeGrad = ctx.createRadialGradient(
            state.ball.x - 3,
            state.ball.y - 4,
            1,
            state.ball.x,
            state.ball.y,
            state.ball.radius + 3
          );
          chargeGrad.addColorStop(0, "hsl(50 100% 84%)");
          chargeGrad.addColorStop(0.55, "hsl(37 100% 66%)");
          chargeGrad.addColorStop(1, "hsl(17 100% 56%)");
          ctx.fillStyle = chargeGrad;
        } else if (state.events.rainbow) {
          const ballGrad = ctx.createRadialGradient(
            state.ball.x - 4,
            state.ball.y - 6,
            2,
            state.ball.x,
            state.ball.y,
            state.ball.radius + 2
          );
          ballGrad.addColorStop(0, hslColor((state.hue + 25) % 360, 100, 80));
          ballGrad.addColorStop(0.5, hslColor((state.hue + 155) % 360, 100, 68));
          ballGrad.addColorStop(1, hslColor((state.hue + 295) % 360, 100, 58));
          ctx.fillStyle = ballGrad;
        } else if (state.events.freeze) {
          ctx.fillStyle = "#9edcff";
        } else {
          ctx.fillStyle = "#f3f8ff";
        }

        if (state.ball.charge.active) {
          ctx.shadowColor = "rgba(255, 208, 96, 0.96)";
        } else if (state.events.rainbow) {
          ctx.shadowColor = hslColor(state.hue % 360, 100, 68);
        } else {
          ctx.shadowColor = "rgba(186, 220, 255, 0.9)";
        }

        ctx.shadowBlur = tier === 0 ? 16 : 0;
        ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (state.ball.charge.active) {
          ctx.strokeStyle = "rgba(255, 224, 126, 0.78)";
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(state.ball.x, state.ball.y, state.ball.radius + 5, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (state.events.freeze) {
          ctx.strokeStyle = "rgba(191, 236, 255, 0.5)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(state.ball.x, state.ball.y, state.ball.radius + 6, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      function drawVfx() {
        const tier = getPerformanceTier();
        if (tier === 2) {
          return;
        }

        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        if (tier === 0) {
          for (const wave of state.vfx.shockwaves) {
            const t = Math.max(0, wave.life / wave.maxLife);
            ctx.globalAlpha = 0.08 + t * 0.78;
            ctx.strokeStyle = wave.color;
            ctx.lineWidth = wave.width + (1 - t) * 2;
            ctx.beginPath();
            ctx.arc(wave.x, wave.y, wave.r, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        for (const arrow of state.vfx.flickArrows) {
          const t = Math.max(0, arrow.life / arrow.maxLife);
          const length = 42 + (1 - t) * 36;
          const ex = arrow.x + arrow.dirX * length;
          const ey = arrow.y + arrow.dirY * length;

          ctx.globalAlpha = 1;
          ctx.strokeStyle = hslColor(arrow.hue, 100, 70, 0.18 + t * 0.72);
          ctx.lineWidth = arrow.width + t * 2.8;
          ctx.beginPath();
          ctx.moveTo(arrow.x, arrow.y);
          ctx.lineTo(ex, ey);
          ctx.stroke();

          if (tier === 0) {
            const nx = -arrow.dirY;
            const ny = arrow.dirX;
            ctx.fillStyle = hslColor(arrow.hue + 8, 100, 73, 0.22 + t * 0.6);
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - arrow.dirX * 11 + nx * 6, ey - arrow.dirY * 11 + ny * 6);
            ctx.lineTo(ex - arrow.dirX * 11 - nx * 6, ey - arrow.dirY * 11 - ny * 6);
            ctx.closePath();
            ctx.fill();
          }
        }

        const particleStep = tier === 1 ? 3 : 1;
        for (let i = 0; i < state.vfx.particles.length; i += particleStep) {
          const p = state.vfx.particles[i];
          const t = Math.max(0, p.life / p.maxLife);
          ctx.globalAlpha = 1;
          ctx.fillStyle = hslColor(p.hue, p.sat, p.light, p.alpha * t);
          ctx.shadowColor = hslColor(p.hue, p.sat, p.light + 4, t * 0.9);
          ctx.shadowBlur = tier === 1 ? 0 : p.glow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (0.72 + t * 0.65), 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();

        if (state.vfx.screenTint > 0.01 && tier === 0) {
          const tint = ctx.createRadialGradient(
            state.width * 0.5,
            state.height * 0.5,
            40,
            state.width * 0.5,
            state.height * 0.5,
            state.width * 0.72
          );
          tint.addColorStop(0, hslColor(state.vfx.tintHue, 94, 66, state.vfx.screenTint * 0.22));
          tint.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = tint;
          ctx.fillRect(0, 0, state.width, state.height);
        }

        if (state.vfx.scorePulse > 0.01 && tier === 0) {
          const alpha = state.vfx.scorePulse * 0.25;
          const edge = ctx.createLinearGradient(0, 0, state.width, 0);
          edge.addColorStop(0, "rgba(128, 225, 255, " + alpha + ")");
          edge.addColorStop(0.5, "rgba(128, 225, 255, " + (alpha * 0.2) + ")");
          edge.addColorStop(1, "rgba(128, 225, 255, " + alpha + ")");
          ctx.fillStyle = edge;
          ctx.fillRect(0, 0, state.width, state.height);
        }
      }

      function drawOverlayText() {
        if (state.ball.respawnTimer <= 0) {
          return;
        }

        ctx.fillStyle = getPerformanceTier() >= 1 ? "#0a152a" : "rgba(0, 0, 0, 0.22)";
        ctx.fillRect(0, 0, state.width, state.height);
        ctx.fillStyle = "rgba(248, 252, 255, 0.95)";
        ctx.font = "600 30px Trebuchet MS";
        ctx.textAlign = "center";

        const count = Math.ceil(state.ball.respawnTimer / 1000);
        if (count > 0) {
          ctx.fillText(String(count), state.width * 0.5, state.height * 0.5 + 12);
        }
      }

      function render() {
        ctx.save();

        if (state.shake > 0) {
          const tier = getPerformanceTier();
          const shakeScale = tier === 2 ? 0.35 : tier === 1 ? 0.7 : 1;
          const amount = state.shake * shakeScale;
          ctx.translate(rand(-amount, amount), rand(-amount, amount));
        }

        const tier = getPerformanceTier();
        const p1ColorA = tier >= 1 ? "#7fcff0" : "rgba(130, 219, 255, 0.95)";
        const p1ColorB = tier >= 1 ? "#4d91be" : "rgba(72, 160, 224, 0.82)";
        const p2ColorA = tier >= 1 ? "#9de4c9" : "rgba(189, 255, 229, 0.92)";
        const p2ColorB = tier >= 1 ? "#5ba98e" : "rgba(92, 206, 170, 0.82)";

        drawBoard();
        drawPaddle(state.player, p1ColorA, p1ColorB);
        drawPaddle(state.ai, p2ColorA, p2ColorB);
        drawBall();
        drawVfx();

        if (state.flash > 0) {
          ctx.fillStyle = `rgba(255, 85, 105, ${state.flash})`;
          ctx.fillRect(0, 0, state.width, state.height);
        }

        drawOverlayText();
        ctx.restore();
      }

      function unlockAudio() {
        if (!state.settings.audioEnabled) {
          return;
        }

        if (!state.audio.ctx) {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx) {
            return;
          }
          state.audio.ctx = new Ctx();
        }

        if (state.audio.ctx.state === "suspended") {
          state.audio.ctx.resume().catch(() => {});
        }

        state.audio.unlocked = true;
      }

      function playTone(freq, duration, type, gainAmount, channel = "sfx") {
        if (!state.audio.unlocked || !state.audio.ctx || !state.settings.audioEnabled) {
          return;
        }

        if (channel === "music" && !state.settings.musicEnabled) {
          return;
        }

        if (channel === "sfx" && !state.settings.sfxEnabled) {
          return;
        }

        const tier = getPerformanceTier();
        if (tier === 2 && Math.random() < 0.45) {
          return;
        }
        if (tier === 1 && Math.random() < 0.18) {
          return;
        }

        const ctxAudio = state.audio.ctx;
        const osc = ctxAudio.createOscillator();
        const gain = ctxAudio.createGain();
        const now = ctxAudio.currentTime;

        const perfAudioScale = tier === 2 ? 0.45 : tier === 1 ? 0.72 : 1;
        const channelVolume = channel === "music" ? state.settings.musicVolume : state.settings.sfxVolume;
        const volume = clamp(state.settings.masterVolume * channelVolume * perfAudioScale, 0, 1);
        const peak = gainAmount * volume;

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(ctxAudio.destination);

        osc.start(now);
        osc.stop(now + duration + 0.03);
      }

      function playSfx(kind) {
        if (!state.settings.audioEnabled || !state.settings.sfxEnabled) {
          return;
        }

        if (kind === "hit") {
          playTone(340 + rand(-24, 24), 0.065, "triangle", 0.13);
          playTone(620 + rand(-36, 36), 0.045, "sine", 0.07);
          return;
        }

        if (kind === "wall") {
          playTone(240 + rand(-20, 20), 0.06, "square", 0.09);
          playTone(390 + rand(-25, 25), 0.042, "triangle", 0.05);
          return;
        }

        if (kind === "flick_up") {
          playTone(520, 0.075, "square", 0.17);
          playTone(790, 0.045, "triangle", 0.1);
          return;
        }

        if (kind === "flick_down") {
          playTone(450, 0.075, "square", 0.17);
          playTone(300, 0.055, "triangle", 0.09);
          return;
        }

        if (kind === "combo_wave") {
          playTone(370, 0.07, "triangle", 0.14);
          playTone(690, 0.09, "sine", 0.11);
          playTone(490, 0.07, "triangle", 0.11);
          return;
        }

        if (kind === "combo_burst") {
          playTone(590, 0.06, "square", 0.16);
          playTone(840, 0.08, "triangle", 0.12);
          playTone(990, 0.07, "sine", 0.1);
          return;
        }

        if (kind === "sticky_attach") {
          playTone(300, 0.06, "sine", 0.1);
          playTone(225, 0.1, "triangle", 0.08);
          return;
        }

        if (kind === "sticky_release") {
          playTone(280, 0.06, "sawtooth", 0.1);
          playTone(380, 0.09, "triangle", 0.08);
          return;
        }

        if (kind === "event_start") {
          playTone(420, 0.09, "triangle", 0.14);
          playTone(640, 0.11, "sine", 0.12);
          playTone(820, 0.12, "triangle", 0.1);
          return;
        }

        if (kind === "event_end") {
          playTone(560, 0.08, "sine", 0.08);
          playTone(390, 0.11, "triangle", 0.07);
          return;
        }

        if (kind === "perfect_flick") {
          playTone(760, 0.05, "triangle", 0.17);
          playTone(980, 0.07, "sine", 0.12);
          playTone(1220, 0.09, "triangle", 0.1);
          return;
        }

        if (kind === "overexpose_start") {
          playTone(420, 0.08, "triangle", 0.18);
          playTone(640, 0.11, "sine", 0.13);
          playTone(860, 0.14, "triangle", 0.1);
          return;
        }

        if (kind === "overexpose_end") {
          playTone(740, 0.06, "sine", 0.1);
          playTone(520, 0.09, "triangle", 0.08);
          return;
        }

        if (kind === "meter_shatter") {
          playTone(300, 0.08, "sawtooth", 0.15);
          playTone(180, 0.12, "triangle", 0.1);
          return;
        }

        if (kind === "survival_ramp") {
          playTone(510, 0.08, "triangle", 0.13);
          playTone(690, 0.1, "sine", 0.09);
          return;
        }

        if (kind === "menu_open") {
          playTone(350, 0.07, "triangle", 0.1);
          playTone(470, 0.08, "sine", 0.07);
          return;
        }

        if (kind === "menu_close") {
          playTone(470, 0.07, "triangle", 0.1);
          playTone(350, 0.08, "sine", 0.07);
          return;
        }

        if (kind === "score") {
          playTone(520, 0.11, "triangle", 0.2);
          playTone(700, 0.14, "sine", 0.14);
          playTone(930, 0.16, "triangle", 0.12);
          return;
        }

        if (kind === "miss") {
          playTone(210, 0.12, "sawtooth", 0.16);
          playTone(160, 0.14, "triangle", 0.12);
        }
      }

      function updateMusic(now) {
        if (state.paused || !state.settings.audioEnabled || !state.settings.musicEnabled || !state.audio.unlocked) {
          return;
        }

        const tier = getPerformanceTier();
        if (tier === 2) {
          return;
        }

        if (now < state.audio.nextBeatAt) {
          return;
        }

        const sequence = [196, 246.94, 293.66, 369.99, 293.66, 246.94];
        const freq = sequence[state.audio.beatStep % sequence.length];

        playTone(freq, 0.24, "triangle", 0.11, "music");
        if (state.audio.beatStep % 2 === 0 && tier === 0) {
          playTone(freq * 0.5, 0.18, "sine", 0.055, "music");
        }

        state.audio.beatStep += 1;
        state.audio.nextBeatAt = now + (tier === 1 ? 760 : 560);
      }

      function setPauseView(view) {
        if (view === "settings") {
          if (pruneScoreLogs(Date.now())) {
            saveScoreLogs();
          }
          renderScoreLogs();
          pauseMain.style.display = "none";
          settingsPanel.classList.add("active");
          pauseTitle.textContent = "Settings";
          closePauseBtn.textContent = "Resume";
          return;
        }

        settingsPanel.classList.remove("active");
        pauseMain.style.display = "grid";
        pauseTitle.textContent = "Paused";
        closePauseBtn.textContent = "Resume";
      }

      function openPauseMenu(showSettings = false) {
        if (state.menuOpen || state.cheats.terminalOpen) {
          return;
        }

        state.paused = true;
        state.menuOpen = true;
        state.pauseStartedAt = performance.now();
        playSfx("menu_open");
        pauseLayer.classList.add("open");
        pauseLayer.setAttribute("aria-hidden", "false");
        setPauseView(showSettings ? "settings" : "main");
        showToast("Paused");
      }

      function closePauseMenu() {
        if (!state.menuOpen) {
          return;
        }

        const now = performance.now();
        const delta = state.pauseStartedAt ? now - state.pauseStartedAt : 0;
        shiftTimedSystemsBy(delta);

        state.menuOpen = false;
        state.paused = false;
        state.pauseStartedAt = 0;

        pauseLayer.classList.remove("open");
        pauseLayer.setAttribute("aria-hidden", "true");
        setPauseView("main");

        playSfx("menu_close");
        lastFrame = now;
        showToast("Resumed");
      }

      function activateTab(tabId) {
        for (const btn of tabButtons) {
          const isActive = btn.dataset.tabTarget === tabId;
          btn.classList.toggle("active", isActive);
          btn.setAttribute("aria-selected", isActive ? "true" : "false");
        }

        for (const panel of tabPanels) {
          panel.classList.toggle("active", panel.id === tabId);
        }
      }

      function setGameMode(mode, announce = true) {
        const nextMode = GAME_MODES[mode] ? mode : "classic";
        const previousMode = state.settings.gameMode;
        state.settings.gameMode = nextMode;

        if (previousMode !== nextMode) {
          state.combo.inputs.length = 0;
          state.combo.pending.left = null;
          state.combo.pending.right = null;
          state.cheats.comboQueue.left.length = 0;
          state.cheats.comboQueue.right.length = 0;
          clearBallCombo();
          clearBallCharge();
        }

        if (!getModeConfig().eventsEnabled && !state.cheats.forcedEvent) {
          clearEffects();
          state.events.active = null;
          state.events.endsAt = 0;
          state.events.nextAt = Number.POSITIVE_INFINITY;
        } else if (!state.cheats.forcedEvent) {
          scheduleNextEvent(performance.now() + 1400);
        }

        if (getModeConfig().survival) {
          resetSurvivalState();
        } else {
          state.survival.elapsedMs = 0;
          state.survival.nextRampMs = 10000;
          state.survival.level = 0;
          refreshBallMaxSpeed();
        }

        if (announce && previousMode !== nextMode) {
          showToast("Mode: " + getModeConfig().label);
        }

        state.runtime.hudNextSyncAt = 0;
        syncHud(performance.now(), true);
      }

      function syncSettingsUi() {
        aiToggle.checked = state.settings.aiEnabled;
        manualBlock.classList.toggle("active", !state.settings.aiEnabled);
        autoGraphicsToggle.checked = state.settings.autoGraphics;
        audioToggle.checked = state.settings.audioEnabled;
        masterVolume.value = String(state.settings.masterVolume);
        musicToggle.checked = state.settings.musicEnabled;
        musicVolume.value = String(state.settings.musicVolume);
        sfxToggle.checked = state.settings.sfxEnabled;
        sfxVolume.value = String(state.settings.sfxVolume);
        perfToggle.checked = state.settings.performanceMode;
        ultraPerfToggle.checked = state.settings.ultraPerformanceMode;
        pointerAssistToggle.checked = state.settings.pointerAssist;
        gameModeSelect.value = state.settings.gameMode;
        aiDifficulty.value = String(state.settings.aiDifficulty);
        aiDifficulty.disabled = !state.settings.aiEnabled;
        masterVolume.disabled = !state.settings.audioEnabled;
        musicToggle.disabled = !state.settings.audioEnabled;
        musicVolume.disabled = !state.settings.audioEnabled || !state.settings.musicEnabled;
        sfxToggle.disabled = !state.settings.audioEnabled;
        sfxVolume.disabled = !state.settings.audioEnabled || !state.settings.sfxEnabled;
        updateAiDifficultyLabel();
        document.body.classList.toggle("perf-mode", state.settings.performanceMode);
        document.body.classList.toggle("ultra-perf", state.settings.ultraPerformanceMode);
        document.body.classList.toggle("compat-mode", state.runtime.compatibility.isSafariLike);
      }

      function tick(now) {
        state.runtime.frameId += 1;

        const frameMs = now - lastFrame;
        const dt = Math.min(0.033, frameMs / 1000);
        const gameDt = dt * state.cheats.gameSpeedMultiplier;
        lastFrame = now;

        updateLagState(frameMs, now);

        if (!state.paused) {
          maybeTriggerEvent(now);
          updateSurvivalRamp(gameDt);
          updatePlayer(gameDt);
          updateSecondPaddle(gameDt);
          updateBall(gameDt);
          updateEffects(gameDt);
          applyBarMaxCheats();
          updateMusic(now);
          if (state.settings.performanceMode || state.runtime.lagDetected || state.runtime.compatibility.isSafariLike) {
            trimEffectsForPerformance();
          }
        }

        if (now >= state.runtime.scoreLogNextPruneAt) {
          state.runtime.scoreLogNextPruneAt = now + 10000;
          if (pruneScoreLogs(Date.now())) {
            saveScoreLogs();
            renderScoreLogs();
          }
        }

        syncHud(now);
        render();
        requestAnimationFrame(tick);
      }

      function setPointerFromEvent(clientY) {
        const rect = canvas.getBoundingClientRect();
        state.input.pointerY = clamp(clientY - rect.top, 0, rect.height);
      }

      function handleGameplayKeydown(event) {
        const key = event.key;
        const lower = key.toLowerCase();

        if (state.cheats.aiVsAi) {
          return;
        }

        if (lower === "w") {
          state.input.p1Up = true;
        }
        if (lower === "s") {
          state.input.p1Down = true;
        }

        if (key === "ArrowUp" && !state.settings.aiEnabled) {
          state.input.p2Up = true;
        }
        if (key === "ArrowDown" && !state.settings.aiEnabled) {
          state.input.p2Down = true;
        }

        if (event.repeat) {
          return;
        }

        if (lower === "a") {
          pulseKey("p1Down");
          tryFlick("left", 1);
          trackPlayerComboInput("a");
        }
        if (lower === "d") {
          pulseKey("p1Up");
          tryFlick("left", -1);
          trackPlayerComboInput("d");
        }
        if (lower === "e") {
          pulseKey("p1Overexpose");
          if (!activateOverexpose("left", true)) {
            if (state.prism.left.overexposeTimer > 0) {
              showToast("Overexpose already active");
            } else {
              showToast("Fill the prism meter to 100% first");
            }
          }
        }
        if (key === "ArrowLeft") {
          pulseKey("p2Up");
          tryFlick("right", -1);
        }
        if (key === "ArrowRight") {
          pulseKey("p2Down");
          tryFlick("right", 1);
        }
      }

      function handleGameplayKeyup(event) {
        const key = event.key;
        const lower = key.toLowerCase();

        if (state.cheats.aiVsAi) {
          return;
        }

        if (lower === "w") {
          state.input.p1Up = false;
        }
        if (lower === "s") {
          state.input.p1Down = false;
        }

        if (key === "ArrowUp") {
          state.input.p2Up = false;
        }
        if (key === "ArrowDown") {
          state.input.p2Down = false;
        }
      }

      window.addEventListener("resize", resize);

      window.addEventListener("keydown", (event) => {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Escape", " "].includes(event.key)) {
          event.preventDefault();
        }

        if (isCheatTerminalToggleKey(event)) {
          event.preventDefault();
          if (state.cheats.terminalOpen) {
            closeCheatTerminal();
          } else {
            openCheatTerminal();
          }
          return;
        }

        unlockAudio();

        if (state.cheats.terminalOpen) {
          if (event.key === "Escape") {
            closeCheatTerminal();
          }
          return;
        }

        if (event.key === "Escape") {
          if (state.menuOpen) {
            closePauseMenu();
          } else {
            openPauseMenu(false);
          }
          return;
        }

        if (event.key.toLowerCase() === "p") {
          if (state.menuOpen) {
            closePauseMenu();
          } else {
            openPauseMenu(false);
          }
          return;
        }

        if (state.menuOpen) {
          return;
        }

        handleGameplayKeydown(event);
      });

      window.addEventListener("keyup", (event) => {
        if (state.cheats.terminalOpen) {
          return;
        }
        handleGameplayKeyup(event);
      });

      canvas.addEventListener("pointerdown", () => {
        unlockAudio();
      });

      window.addEventListener("mousemove", (event) => {
        if (state.menuOpen || state.cheats.terminalOpen || !state.settings.pointerAssist) {
          return;
        }

        state.input.pointerActive = true;
        setPointerFromEvent(event.clientY);
      });

      window.addEventListener("mouseout", (event) => {
        if (event.relatedTarget || event.toElement) {
          return;
        }

        state.input.pointerActive = false;
        state.input.pointerY = null;
      });

      window.addEventListener("blur", () => {
        state.input.pointerActive = false;
        state.input.pointerY = null;
      });


      canvas.addEventListener("touchstart", (event) => {
        unlockAudio();
        if (state.menuOpen || state.cheats.terminalOpen || !state.settings.pointerAssist || !event.touches[0]) {
          return;
        }

        state.input.pointerActive = true;
        setPointerFromEvent(event.touches[0].clientY);
      }, { passive: true });

      canvas.addEventListener("touchmove", (event) => {
        if (state.menuOpen || state.cheats.terminalOpen || !state.settings.pointerAssist || !event.touches[0]) {
          return;
        }

        setPointerFromEvent(event.touches[0].clientY);
      }, { passive: true });

      canvas.addEventListener("touchend", () => {
        state.input.pointerActive = false;
        state.input.pointerY = null;
      }, { passive: true });

      resetBtn.addEventListener("click", () => {
        resetMatch();
      });

      pauseResumeBtn.addEventListener("click", closePauseMenu);
      closePauseBtn.addEventListener("click", closePauseMenu);

      pauseSettingsBtn.addEventListener("click", () => {
        setPauseView("settings");
      });

      settingsBackBtn.addEventListener("click", () => {
        setPauseView("main");
      });

      pauseRestartBtn.addEventListener("click", () => {
        resetMatch();
        closePauseMenu();
      });

      tabButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          activateTab(btn.dataset.tabTarget);
        });
      });

      aiToggle.addEventListener("change", () => {
        state.settings.aiEnabled = aiToggle.checked;
        if (!state.settings.aiEnabled) {
          state.cheats.aiVsAi = false;
        }
        state.runtime.aiAdaptiveBias = 0;
        state.ai.confusedUntil = 0;
        state.input.p2Up = false;
        state.input.p2Down = false;
        manualBlock.classList.toggle("active", !state.settings.aiEnabled);
        syncSettingsUi();
        state.runtime.hudNextSyncAt = 0;
        syncHud(performance.now(), true);
        showToast(state.settings.aiEnabled ? "AI opponent enabled" : "Local 2-player enabled");
      });

      aiDifficulty.addEventListener("input", () => {
        state.settings.aiDifficulty = clamp(Math.round(Number(aiDifficulty.value) || 6), 1, 10);
        updateAiDifficultyLabel();
      });

      autoGraphicsToggle.addEventListener("change", () => {
        state.settings.autoGraphics = autoGraphicsToggle.checked;
        if (!state.settings.autoGraphics) {
          state.runtime.compatibility.autoPerfApplied = false;
        } else {
          detectCompatibilityProfile();
          if (state.runtime.compatibility.isSafariLike && state.settings.performanceMode) {
            showToast("Auto graphics enabled for this browser profile");
            syncSettingsUi();
            resize();
            trimEffectsForPerformance();
            return;
          }
        }
        syncSettingsUi();
        showToast(state.settings.autoGraphics ? "Auto graphics enabled" : "Auto graphics disabled");
      });

      pointerAssistToggle.addEventListener("change", () => {
        state.settings.pointerAssist = pointerAssistToggle.checked;
        if (!state.settings.pointerAssist) {
          state.input.pointerActive = false;
          state.input.pointerY = null;
        }
      });

      audioToggle.addEventListener("change", () => {
        state.settings.audioEnabled = audioToggle.checked;
        if (state.settings.audioEnabled) {
          unlockAudio();
          showToast("Audio enabled");
        } else {
          showToast("Audio muted");
        }
        syncSettingsUi();
      });

      masterVolume.addEventListener("input", () => {
        state.settings.masterVolume = Number(masterVolume.value);
      });

      musicToggle.addEventListener("change", () => {
        state.settings.musicEnabled = musicToggle.checked;
        if (state.settings.musicEnabled && state.settings.audioEnabled) {
          unlockAudio();
          showToast("Background music enabled");
        } else {
          showToast("Background music disabled");
        }
        syncSettingsUi();
      });

      musicVolume.addEventListener("input", () => {
        state.settings.musicVolume = Number(musicVolume.value);
      });

      sfxToggle.addEventListener("change", () => {
        state.settings.sfxEnabled = sfxToggle.checked;
        if (state.settings.sfxEnabled && state.settings.audioEnabled) {
          unlockAudio();
        }
        syncSettingsUi();
        showToast(state.settings.sfxEnabled ? "Sound effects enabled" : "Sound effects disabled");
      });

      sfxVolume.addEventListener("input", () => {
        state.settings.sfxVolume = Number(sfxVolume.value);
      });

      gameModeSelect.addEventListener("change", () => {
        setGameMode(gameModeSelect.value, true);
      });

      perfToggle.addEventListener("change", () => {
        state.settings.performanceMode = perfToggle.checked;
        if (!state.settings.performanceMode) {
          state.settings.ultraPerformanceMode = false;
        }
        syncSettingsUi();
        trimEffectsForPerformance();
        resize();
        showToast(state.settings.performanceMode ? "Performance mode enabled" : "Performance mode disabled");
      });

      ultraPerfToggle.addEventListener("change", () => {
        state.settings.ultraPerformanceMode = ultraPerfToggle.checked;
        if (state.settings.ultraPerformanceMode) {
          state.settings.performanceMode = true;
        }
        syncSettingsUi();
        trimEffectsForPerformance();
        resize();
        showToast(state.settings.ultraPerformanceMode ? "Ultra performance enabled" : "Ultra performance disabled");
      });

      loadScoreLogs();
      renderScoreLogs();
      detectCompatibilityProfile();
      ensureCheatTerminal();
      syncSettingsUi();
      resize();
      setGameMode(state.settings.gameMode, false);
      activateTab("graphicsTab");
      resetMatch();
      requestAnimationFrame(tick);
    })();
