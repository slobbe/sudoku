# Contributing

Thanks for contributing to Sudoku PWA.

## Local Development

Install dependencies and run the Next.js dev server:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Development Notes

- Core puzzle logic is in `src/lib/sudoku.ts`
- UI state and interactions are in `src/components/sudoku-app.tsx`
- Themes and responsive layout are in `app/globals.css`
- App metadata and manifest wiring are in `app/layout.tsx`
- Offline caching and update flow are in `public/sw.js`

## Testing & Validation

Before opening a PR, run:

```bash
npm run lint
npm test
npm run build
```

## Versioning & PWA Cache

The project currently uses semantic versioning in the `0.2.x` line.

When releasing a new version, keep app version values aligned in:

- `src/components/sudoku-app.tsx` (`APP_VERSION`, shown in Settings)
- `public/sw.js` (`APP_VERSION`, used by cache naming)

Bumping `APP_VERSION` in `public/sw.js` creates a new cache name so installed PWAs fetch fresh assets.

## Project Structure

- `app/layout.tsx` - app metadata and global shell
- `app/page.tsx` - page entrypoint
- `app/globals.css` - responsive styling and themes
- `src/lib/sudoku.ts` - generator/solver/validation logic
- `src/components/sudoku-app.tsx` - state, input handling, persistence, stats, updates
- `public/sw.js` - service worker cache/update logic
- `public/manifest.webmanifest` - PWA manifest
- `public/icons/` - PWA icons
