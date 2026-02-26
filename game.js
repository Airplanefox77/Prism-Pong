    (() => {
      const canvas = document.getElementById("pong");
      const ctx = canvas.getContext("2d");

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

      const musicToggle = document.getElementById("musicToggle");
      const musicVolume = document.getElementById("musicVolume");
      const perfToggle = document.getElementById("perfToggle");
      const ultraPerfToggle = document.getElementById("ultraPerfToggle");
      const aiToggle = document.getElementById("aiToggle");
      const pointerAssistToggle = document.getElementById("pointerAssistToggle");
      const manualBlock = document.getElementById("manualBlock");

      const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));
      const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));

      const flickKeyMap = {
        p1Down: document.getElementById("keyA"),
        p1Up: document.getElementById("keyD"),
        p2Up: document.getElementById("keyLeft"),
        p2Down: document.getElementById("keyRight")
      };

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
          streak: 0
        },
        settings: {
          aiEnabled: true,
          pointerAssist: true,
          musicEnabled: true,
          musicVolume: 0.35,
          performanceMode: false,
          ultraPerformanceMode: false
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
          windowMs: 760,
          inputs: []
        },
        player: {
          x: 24,
          y: 220,
          width: 15,
          height: 116,
          baseHeight: 116,
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
          speed: 470,
          manualSpeed: 620,
          lastY: 220,
          flickTimer: 0,
          flickDir: 0
        },
        ball: {
          x: 480,
          y: 270,
          vx: 340,
          vy: 170,
          radius: 11,
          baseRadius: 11,
          maxSpeed: 900,
          respawnTimer: 0,
          trail: [],
          sticky: {
            attachedTo: null,
            timer: 0
          },
          combo: {
            mode: null,
            timer: 0,
            duration: 0,
            baseVy: 0,
            travelDir: 1,
            speed: 0,
            vfxTick: 0
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
        audio: {
          ctx: null,
          unlocked: false,
          nextBeatAt: 0,
          beatStep: 0
        },
        vfx: {
          particles: [],
          shockwaves: [],
          flickArrows: [],
          screenTint: 0,
          tintHue: 200,
          scorePulse: 0
        },
        runtime: {
          frameMsEMA: 16.7,
          lagDetected: false,
          lagHoldUntil: 0,
          frameId: 0,
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
          duration: 2800,
          announce: "Freeze Ball: ball movement halted"
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

      const FLICK_ANIM_MS = 180;
      const MAX_VFX_PARTICLES = 280;
      const MAX_VFX_SHOCKWAVES = 36;

      let lastFrame = performance.now();

      function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
      }

      function rand(min, max) {
        return min + Math.random() * (max - min);
      }
      function updateLagState(frameMs, now) {
        const runtime = state.runtime;
        runtime.frameMsEMA = runtime.frameMsEMA * 0.9 + frameMs * 0.1;

        if (frameMs > 34 || runtime.frameMsEMA > 22) {
          runtime.lagHoldUntil = now + 2200;
        }

        runtime.lagDetected = now < runtime.lagHoldUntil;
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
          density = 0.24;
        } else if (tier === 1) {
          density = 0.4;
        }

        if (state.runtime.lagDetected) {
          density *= 0.35;
        }

        return Math.max(0.08, density);
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

        return {
          particle: lag ? 60 : (tier === 2 ? 82 : tier === 1 ? 118 : MAX_VFX_PARTICLES),
          shockwave: lag ? 6 : (tier === 2 ? 0 : tier === 1 ? 8 : MAX_VFX_SHOCKWAVES),
          flickArrow: lag ? 5 : (tier === 2 ? 0 : tier === 1 ? 8 : 22)
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

      function applyPlayerComboMove(type) {
        if (state.paused || state.ball.respawnTimer > 0 || state.events.freeze) {
          return false;
        }

        const side = "left";
        const paddle = state.player;
        const attachedToPlayer = state.ball.sticky.attachedTo === "player";

        if (!attachedToPlayer && !isBallCloseToPaddle(paddle, side)) {
          return false;
        }

        const travelDir = 1;
        const currentSpeed = Math.hypot(state.ball.vx, state.ball.vy);
        const comboSpeed = clamp(currentSpeed + 340, 660, state.ball.maxSpeed + 280);

        if (attachedToPlayer) {
          const releaseDir = type === "burstUp" ? -1 : 1;
          releaseStickyBall(releaseDir, false);
        }

        if (type === "wave") {
          state.ball.vx = travelDir * comboSpeed * 0.94;
          state.ball.vy = 0;
          state.ball.combo.mode = "wave";
          state.ball.combo.timer = 420;
          state.ball.combo.duration = 420;
          state.ball.combo.baseVy = clamp((state.player.y - state.player.lastY) * 7, -120, 120);
          state.ball.combo.travelDir = travelDir;
          state.ball.combo.speed = Math.abs(state.ball.vx);
          state.ball.combo.vfxTick = 0;
          triggerPaddleFlick(paddle, -1);
          showToast("Combo: Prism Zigzag");
          playSfx("combo_wave");
        } else {
          const burstDir = type === "burstUp" ? -1 : 1;
          const burstSpeed = clamp(comboSpeed * 0.9, 760, state.ball.maxSpeed + 320);
          state.ball.vx = travelDir * burstSpeed * 0.84;
          state.ball.vy = burstDir * burstSpeed;
          state.ball.combo.mode = "burst";
          state.ball.combo.timer = 250;
          state.ball.combo.duration = 250;
          state.ball.combo.baseVy = state.ball.vy;
          state.ball.combo.travelDir = travelDir;
          state.ball.combo.speed = Math.abs(state.ball.vx);
          state.ball.combo.vfxTick = 0;
          triggerPaddleFlick(paddle, burstDir);
          showToast(type === "burstDown" ? "Combo: Down Burst" : "Combo: Up Burst");
          playSfx("combo_burst");
        }

        state.ball.x = paddle.x + paddle.width + state.ball.radius + 2;
        state.shake = Math.max(state.shake, 11);
        state.vfx.screenTint = Math.max(state.vfx.screenTint, 0.22);
        state.vfx.tintHue = state.hue % 360;

        spawnComboRainbowVfx(
          state.ball.x,
          state.ball.y,
          travelDir,
          Math.sign(state.ball.vy) || 1,
          1.35
        );

        return true;
      }

      function trackPlayerComboInput(key) {
        const now = performance.now();
        const combo = state.combo;
        combo.inputs.push({ key, at: now });

        while (combo.inputs.length && now - combo.inputs[0].at > combo.windowMs) {
          combo.inputs.shift();
        }
        while (combo.inputs.length > 4) {
          combo.inputs.shift();
        }

        if (combo.inputs.length < 4) {
          return;
        }

        const sequence = combo.inputs.map((entry) => entry.key).join("");
        let recognized = false;
        let activated = false;
        if (sequence === "adda") {
          recognized = true;
          activated = applyPlayerComboMove("wave");
        } else if (sequence === "addd") {
          recognized = true;
          activated = applyPlayerComboMove("burstDown");
        } else if (sequence === "daaa") {
          recognized = true;
          activated = applyPlayerComboMove("burstUp");
        }

        if (recognized || activated) {
          combo.inputs.length = 0;
        }
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
        state.events.nextAt = now + rand(6500, 14000);
      }

      function showToast(message) {
        eventToast.textContent = message;
        eventToast.classList.add("show");
        clearTimeout(showToast.hideTimer);
        showToast.hideTimer = setTimeout(() => {
          eventToast.classList.remove("show");
        }, 2200);
      }

      function syncHud() {
        pointsValue.textContent = String(state.score.points);
        missesValue.textContent = String(state.score.misses);
        streakValue.textContent = String(state.score.streak);
        modeBadge.textContent = state.settings.aiEnabled ? "Opponent: AI" : "Opponent: Player 2";

        if (!state.events.active) {
          eventValue.textContent = "None active";
          eventValue.style.color = "var(--text-main)";
          return;
        }

        const now = state.paused && state.pauseStartedAt ? state.pauseStartedAt : performance.now();
        const remaining = Math.max(0, (state.events.endsAt - now) / 1000);
        eventValue.textContent = `${eventCatalog[state.events.active].label} (${remaining.toFixed(1)}s)`;

        if (state.events.rainbow) {
          eventValue.style.color = `hsl(${state.hue % 360} 100% 72%)`;
        } else if (state.events.freeze) {
          eventValue.style.color = "#9ad8ff";
        } else if (state.events.sticky) {
          eventValue.style.color = "#8ff9d7";
        } else {
          eventValue.style.color = "#ffd6a6";
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

        const direction = target === "player" ? 1 : -1;
        const source = target === "player" ? state.player : state.ai;
        const delta = source.y - source.lastY;

        state.ball.vx = direction * clamp(Math.abs(state.ball.vx) + 80, 320, state.ball.maxSpeed);

        if (flickDir !== 0) {
          state.ball.vx = direction * clamp(Math.abs(state.ball.vx) + 160, 460, state.ball.maxSpeed + 150);
          state.ball.vy = clamp(flickDir * (Math.abs(state.ball.vy) + 440), -980, 980);
          playSfx(flickDir < 0 ? "flick_up" : "flick_down");
        } else {
          state.ball.vy = clamp(delta * 14 + rand(-150, 150), -520, 520);
        }

        const releaseX = target === "player" ? source.x + source.width + 6 : source.x - 6;
        const releaseY = source.y + source.height * 0.5;
        spawnImpactVfx(releaseX, releaseY, 146, direction, flickDir * 0.55, 0.95);

        state.ball.sticky.attachedTo = null;
        state.ball.sticky.timer = 0;

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

        if (attachedToThis) {
          releaseStickyBall(dirSign, false);
          return;
        }

        if (state.events.freeze || !isBallCloseToPaddle(paddle, side)) {
          return;
        }

        const travelDir = side === "left" ? 1 : -1;
        const flickSpeed = clamp(Math.hypot(state.ball.vx, state.ball.vy) + 220, 420, state.ball.maxSpeed + 180);

        state.ball.vx = travelDir * flickSpeed * 0.82;
        state.ball.vy = clamp(dirSign * flickSpeed, -980, 980);

        if (side === "left") {
          state.ball.x = paddle.x + paddle.width + state.ball.radius + 1;
        } else {
          state.ball.x = paddle.x - state.ball.radius - 1;
        }

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

      function registerPlayerReturn() {
        const gain = state.events.rainbow ? 2 : 1;
        state.score.points += gain;
        state.score.streak += 1;
        if (state.events.rainbow && state.score.misses > 0) {
          state.score.misses -= 1;
        }
      }

      function respawnBall(direction) {
        state.ball.x = state.width * 0.5;
        state.ball.y = state.height * 0.5;
        const speed = 340;
        state.ball.vx = direction * speed;
        state.ball.vy = rand(-180, 180);
        state.ball.respawnTimer = 700;
        state.ball.sticky.attachedTo = null;
        state.ball.sticky.timer = 0;
        state.ball.trail.length = 0;
        clearBallCombo();
      }

      function resetMatch() {
        state.score.points = 0;
        state.score.misses = 0;
        state.score.streak = 0;
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

        state.player.flickTimer = 0;
        state.ai.flickTimer = 0;

        state.vfx.particles.length = 0;
        state.vfx.shockwaves.length = 0;
        state.vfx.flickArrows.length = 0;
        state.vfx.screenTint = 0;
        state.vfx.scorePulse = 0;
        state.combo.inputs.length = 0;

        state.runtime.frameMsEMA = 16.7;
        state.runtime.lagDetected = false;
        state.runtime.lagHoldUntil = 0;
        state.runtime.frameId = 0;
        state.runtime.vfxLimiter.budgetFrameId = -1;
        state.runtime.vfxLimiter.generalBudget = 0;
        state.runtime.vfxLimiter.flickBudget = 0;

        state.ball.radius = state.ball.baseRadius;
        respawnBall(Math.random() > 0.5 ? 1 : -1);
        syncHud();
        showToast("Match reset");
      }

      function resize() {
        const tier = getPerformanceTier();
        const dprCap = tier === 2 ? 1 : tier === 1 ? 1.35 : 2;
        const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, dprCap));
        const bounds = canvas.getBoundingClientRect();
        const width = Math.round(bounds.width);
        const height = Math.round(bounds.height);

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
        state.player.lastY = state.player.y;

        if (state.settings.pointerAssist && state.input.pointerActive && state.input.pointerY !== null) {
          const targetY = clamp(state.input.pointerY - state.player.height * 0.5, 0, state.height - state.player.height);
          const followRate = clamp(dt * 12, 0, 1);
          state.player.y += (targetY - state.player.y) * followRate;
        }

        if (state.input.p1Up) {
          state.player.y -= state.player.speed * dt;
        }
        if (state.input.p1Down) {
          state.player.y += state.player.speed * dt;
        }

        state.player.y = clamp(state.player.y, 0, state.height - state.player.height);
      }

      function updateAi(dt) {
        state.ai.lastY = state.ai.y;
        const center = state.ai.y + state.ai.height * 0.5;
        const lead = clamp((state.ball.x - state.width * 0.6) / (state.width * 0.4), 0, 1);
        const target = state.ball.y + state.ball.vy * 0.05 * lead;
        const direction = target > center ? 1 : -1;

        state.ai.y += direction * state.ai.speed * dt * (0.5 + lead * 0.85);
        state.ai.y += rand(-18, 18) * dt;
        state.ai.y = clamp(state.ai.y, 0, state.height - state.ai.height);
      }

      function updateManualP2(dt) {
        state.ai.lastY = state.ai.y;

        if (state.input.p2Up) {
          state.ai.y -= state.ai.manualSpeed * dt;
        }
        if (state.input.p2Down) {
          state.ai.y += state.ai.manualSpeed * dt;
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
        const speed = clamp(Math.hypot(state.ball.vx, state.ball.vy) + 24, 330, state.ball.maxSpeed);

        const horizontal = Math.cos(normalized * 0.95);
        const vertical = Math.sin(normalized * 1.15);

        state.ball.vx = (side === "left" ? 1 : -1) * speed * Math.max(0.42, horizontal);
        state.ball.vy = speed * vertical + (paddle.y - paddle.lastY) * 10;

        if (side === "left") {
          state.ball.x = paddle.x + paddle.width + state.ball.radius;
          registerPlayerReturn();
        } else {
          state.ball.x = paddle.x - state.ball.radius;
        }

        const impactX = side === "left" ? paddle.x + paddle.width + 4 : paddle.x - 4;
        spawnImpactVfx(impactX, state.ball.y, side === "left" ? 198 : 156, side === "left" ? 1 : -1, normalized * 0.9, 1.1);

        if (state.events.sticky) {
          attachBallToPaddle(side === "left" ? "player" : "ai");
        }

        playSfx("hit");
      }

      function handleScoring() {
        if (state.ball.x + state.ball.radius < 0) {
          state.score.misses += 1;
          state.score.streak = 0;
          state.flash = 0.25;
          state.shake = 10;
          spawnGoalVfx("left");
          respawnBall(1);
          showToast(state.settings.aiEnabled ? "Missed return" : "Player 2 scored");
          playSfx("miss");
          return;
        }

        if (state.ball.x - state.ball.radius > state.width) {
          state.score.points += state.events.rainbow ? 6 : 3;
          state.score.streak += 1;
          state.shake = 6;
          spawnGoalVfx("right");
          respawnBall(-1);
          showToast(state.settings.aiEnabled ? "You scored past the AI" : "Player 1 scored");
          playSfx("score");
        }
      }

      function updateBall(dt) {
        if (state.ball.respawnTimer > 0) {
          state.ball.respawnTimer -= dt * 1000;
          return;
        }

        if (state.ball.sticky.attachedTo) {
          const anchor = state.ball.sticky.attachedTo === "player" ? state.player : state.ai;
          const dir = state.ball.sticky.attachedTo === "player" ? 1 : -1;
          state.ball.x = anchor.x + (dir === 1 ? anchor.width + state.ball.radius : -state.ball.radius);
          state.ball.y = anchor.y + anchor.height * 0.5;
          state.ball.sticky.timer -= dt * 1000;
          if (state.ball.sticky.timer <= 0 || !state.events.sticky) {
            releaseStickyBall(0, true);
          }
          return;
        }

        if (state.events.freeze) {
          return;
        }

        if (state.ball.combo.mode) {
          const combo = state.ball.combo;
          combo.timer -= dt * 1000;

          if (combo.timer <= 0) {
            clearBallCombo();
          } else {
            if (combo.mode === "wave") {
              const progress = 1 - combo.timer / combo.duration;
              const wave = Math.sin(progress * Math.PI * 2.35 - Math.PI / 2);
              state.ball.vy = clamp(combo.baseVy + wave * 760, -1040, 1040);
            } else {
              const minBurstVy = Math.abs(combo.baseVy) * 0.78;
              state.ball.vy *= Math.pow(0.985, dt * 60);
              if (Math.abs(state.ball.vy) < minBurstVy) {
                state.ball.vy = Math.sign(combo.baseVy || 1) * minBurstVy;
              }
            }

            state.ball.vx = combo.travelDir * Math.max(Math.abs(state.ball.vx), combo.speed);

            combo.vfxTick -= dt * 1000;
            if (combo.vfxTick <= 0) {
              combo.vfxTick = getPerformanceTier() === 0 ? 24 : 42;
              spawnComboRainbowVfx(
                state.ball.x,
                state.ball.y,
                combo.travelDir,
                Math.sign(state.ball.vy) || 1,
                0.65
              );
            }
          }
        }

        state.ball.x += state.ball.vx * dt;
        state.ball.y += state.ball.vy * dt;

        const tier = getPerformanceTier();
        const trailSpawnChance = tier === 2 ? 0.34 : tier === 1 ? 0.72 : 1;
        if (Math.random() <= trailSpawnChance) {
          state.ball.trail.push({ x: state.ball.x, y: state.ball.y, r: state.ball.radius, a: tier === 2 ? 0.19 : tier === 1 ? 0.24 : 0.28 });
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

        for (const trail of state.ball.trail) {
          trail.a = Math.max(0, trail.a - dt * 0.75);
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
          ctx.fillStyle = state.events.rainbow
            ? `hsla(${(state.hue - trail.r * 8) % 360} 100% 66% / ${trail.a})`
            : `rgba(194, 228, 255, ${trail.a})`;
          ctx.arc(trail.x, trail.y, trail.r * 0.95, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        if (state.events.rainbow) {
          const ballGrad = ctx.createRadialGradient(
            state.ball.x - 4,
            state.ball.y - 6,
            2,
            state.ball.x,
            state.ball.y,
            state.ball.radius + 2
          );
          ballGrad.addColorStop(0, `hsl(${(state.hue + 25) % 360} 100% 80%)`);
          ballGrad.addColorStop(0.5, `hsl(${(state.hue + 155) % 360} 100% 68%)`);
          ballGrad.addColorStop(1, `hsl(${(state.hue + 295) % 360} 100% 58%)`);
          ctx.fillStyle = ballGrad;
        } else if (state.events.freeze) {
          ctx.fillStyle = "#9edcff";
        } else {
          ctx.fillStyle = "#f3f8ff";
        }

        ctx.shadowColor = state.events.rainbow ? `hsl(${state.hue % 360} 100% 68%)` : "rgba(186, 220, 255, 0.9)";
        ctx.shadowBlur = tier === 0 ? 16 : 0;
        ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

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
        if (!state.settings.musicEnabled) {
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

      function playTone(freq, duration, type, gainAmount) {
        if (!state.audio.unlocked || !state.audio.ctx || !state.settings.musicEnabled) {
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
        const volume = clamp(state.settings.musicVolume * perfAudioScale, 0, 1);
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
        if (!state.settings.musicEnabled) {
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
        if (state.paused || !state.settings.musicEnabled || !state.audio.unlocked) {
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

        playTone(freq, 0.24, "triangle", 0.11);
        if (state.audio.beatStep % 2 === 0 && tier === 0) {
          playTone(freq * 0.5, 0.18, "sine", 0.055);
        }

        state.audio.beatStep += 1;
        state.audio.nextBeatAt = now + (tier === 1 ? 760 : 560);
      }

      function setPauseView(view) {
        if (view === "settings") {
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
        if (state.menuOpen) {
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

        if (state.events.active) {
          state.events.endsAt += delta;
        }
        state.events.nextAt += delta;

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

      function syncSettingsUi() {
        aiToggle.checked = state.settings.aiEnabled;
        manualBlock.classList.toggle("active", !state.settings.aiEnabled);
        musicToggle.checked = state.settings.musicEnabled;
        musicVolume.value = String(state.settings.musicVolume);
        perfToggle.checked = state.settings.performanceMode;
        ultraPerfToggle.checked = state.settings.ultraPerformanceMode;
        pointerAssistToggle.checked = state.settings.pointerAssist;
        document.body.classList.toggle("perf-mode", state.settings.performanceMode);
        document.body.classList.toggle("ultra-perf", state.settings.ultraPerformanceMode);
      }

      function tick(now) {
        state.runtime.frameId += 1;

        const frameMs = now - lastFrame;
        const dt = Math.min(0.033, frameMs / 1000);
        lastFrame = now;

        updateLagState(frameMs, now);

        if (!state.paused) {
          maybeTriggerEvent(now);
          updatePlayer(dt);
          updateSecondPaddle(dt);
          updateBall(dt);
          updateEffects(dt);
          updateMusic(now);
          if (state.settings.performanceMode || state.runtime.lagDetected) {
            trimEffectsForPerformance();
          }
        }

        syncHud();
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

        unlockAudio();

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
        handleGameplayKeyup(event);
      });

      canvas.addEventListener("pointerdown", () => {
        unlockAudio();
      });

      window.addEventListener("mousemove", (event) => {
        if (state.menuOpen || !state.settings.pointerAssist) {
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
        if (state.menuOpen || !state.settings.pointerAssist || !event.touches[0]) {
          return;
        }

        state.input.pointerActive = true;
        setPointerFromEvent(event.touches[0].clientY);
      }, { passive: true });

      canvas.addEventListener("touchmove", (event) => {
        if (state.menuOpen || !state.settings.pointerAssist || !event.touches[0]) {
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
        state.input.p2Up = false;
        state.input.p2Down = false;
        manualBlock.classList.toggle("active", !state.settings.aiEnabled);
        showToast(state.settings.aiEnabled ? "AI opponent enabled" : "Local 2-player enabled");
      });

      pointerAssistToggle.addEventListener("change", () => {
        state.settings.pointerAssist = pointerAssistToggle.checked;
        if (!state.settings.pointerAssist) {
          state.input.pointerActive = false;
          state.input.pointerY = null;
        }
      });

      musicToggle.addEventListener("change", () => {
        state.settings.musicEnabled = musicToggle.checked;
        if (state.settings.musicEnabled) {
          unlockAudio();
          showToast("Music enabled");
        } else {
          showToast("Music disabled");
        }
      });

      musicVolume.addEventListener("input", () => {
        state.settings.musicVolume = Number(musicVolume.value);
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

      resize();
      syncSettingsUi();
      activateTab("musicTab");
      resetMatch();
      scheduleNextEvent(performance.now() + 2000);
      requestAnimationFrame(tick);
    })();
