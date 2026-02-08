# Sudoku PWA

Vanilla JavaScript Sudoku game built for GitHub Pages.

## MVP Features

- Unique puzzle generator (exactly one solution)
- Three difficulties: easy, medium, hard
- Hints (3 per game)
- Auto-save and restore current game in localStorage
- Installable PWA with offline support

## Local Run

Because this app uses a service worker, serve it with a local web server instead of opening `index.html` directly.

Examples:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy To GitHub Pages

1. Push this repository to GitHub.
2. Open repository **Settings -> Pages**.
3. Under **Build and deployment**, choose:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` (or your default branch), `/ (root)`
4. Save and wait for Pages to publish.

The app uses relative paths (`./...`) so it works on both user and project Pages URLs.

## PWA Update Notes

- When releasing a new version, bump `APP_VERSION` in `sw.js`.
- This forces a new cache name so installed PWAs fetch fresh files instead of staying on an older cached build.

## Structure

- `index.html` - app shell
- `styles.css` - responsive UI styling
- `sudoku.js` - generator/solver/validation logic
- `app.js` - game state and interactions
- `sw.js` - service worker cache logic
- `manifest.webmanifest` - PWA manifest
- `icons/` - PWA icons
