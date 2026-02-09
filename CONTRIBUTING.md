# Contributing

Thanks for contributing to Sudoku PWA.

## Local Run

Because the app uses a service worker, serve it with a local web server instead of opening `index.html` directly.

Example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Development Notes

- Core game logic is in `sudoku.js`
- UI state and interactions are in `app.js`
- Themes and responsive layout are in `styles.css`
- PWA shell and dialogs are in `index.html`
- Offline caching and update flow are in `sw.js`

## Versioning & PWA Cache

The project currently uses semantic versioning in the `0.1.x` line.

When releasing a new version, keep app version values aligned in:

- `sw.js` (`APP_VERSION`, used by cache naming)
- `app.js` (`APP_VERSION`, shown in settings)
- `index.html` (settings app info version text)

Bumping `APP_VERSION` in `sw.js` creates a new cache name so installed PWAs fetch fresh assets.

## Project Structure

- `index.html` - app shell and dialogs
- `styles.css` - responsive styling and themes
- `sudoku.js` - generator/solver/validation logic
- `app.js` - state, input handling, persistence, stats, updates
- `sw.js` - service worker cache/update logic
- `manifest.webmanifest` - PWA manifest
- `icons/` - PWA icons
