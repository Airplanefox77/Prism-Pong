# Prism Pong

A glassmorphic Pong variant with event-driven gameplay, directional flick mechanics, buffered combo shots, prism meters, and performance scaling.

## Files

- `index.html` - page structure and UI markup
- `styles.css` - styling, glassmorphic theme, responsive layout, pause/settings animations, prism meter UI
- `game.js` - all gameplay logic, rendering, controls, events, game modes, VFX, audio, and performance tuning

## Run

1. Open `index.html` directly in a browser, or run a local server:

```bash
python3 -m http.server 8080
```

2. Visit `http://localhost:8080`.

## Controls

- `W` / `S`: move Player 1 paddle
- Mouse / touch assist (toggle in settings): move Player 1 paddle
- `A`: Player 1 down flick
- `D`: Player 1 up flick
- `Esc` or `P`: pause/resume menu
- `Arrow Up` / `Arrow Down`: Player 2 move (when AI is disabled)
- `Arrow Left` / `Arrow Right`: Player 2 flick

## Game Modes

- **Classic Prism**: standard rules + random events
- **Arcade Chaos**: random events trigger more frequently
- **Duel Mode**: no random events, pure flick/combo play
- **Light Survival**: speed ramps every 10 seconds

## Combo Moves (Buffered)

Input is accepted with a larger timing window, and recognized combos can be primed before contact.

- `A D D A` (`ADDA`): Prism Zigzag
- `A D D D` (`ADDD`): Down Burst
- `D A A A` (`DAAA`): Up Burst

## Perfect Flick

If a flick is timed within `0.2s` of paddle impact:

- the ball becomes charged
- the next scoring hit from that side gets a `x2` bonus

## Prism Meter System

Each side has a prism meter:

- successful returns and pressure fill meter
- higher meter increases shot power
- higher meter slows the opposing paddle
- when full, **Overexpose Mode** activates with stronger scoring multiplier and brighter trails
- on miss, that side’s meter visually shatters and resets

## Special Events

- **Large Ball**
- **Rainbow Ball**
- **Freeze Ball** (ball moves at 25% speed)
- **Sticky Ball**

## Performance Modes

- **Performance Mode**: removes heavy transparency/blur and reduces VFX density
- **Ultra Performance**: cuts effects further and disables expensive UI animation behavior
- runtime lag detection also dynamically throttles VFX spawning
