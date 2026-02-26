# Prism Pong

A glassmorphic Pong variant with special events, flick mechanics, combo shots, pause/settings UI, sound effects, and performance modes.

## Files

- `index.html` - page structure and UI markup
- `styles.css` - styling, glassmorphic theme, responsive layout, pause/settings animations
- `game.js` - all gameplay logic, rendering, controls, events, VFX, audio, and performance tuning

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

## Player 1 Combo Moves

Press quickly within the combo window:

- `A D D A` (`ADDA`): Prism Zigzag (quick up/down travel)
- `A D D D` (`ADDD`): Down Burst
- `D A A A` (`DAAA`): Up Burst

## Special Events

- Large Ball
- Rainbow Ball
- Freeze Ball
- Sticky Ball

## Performance Modes

- **Performance Mode**: removes heavy transparency/blur and reduces VFX density.
- **Ultra Performance**: cuts effects further and disables more expensive UI animation behavior.
