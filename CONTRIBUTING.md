# Contributing to TaskFuchs

Thanks for your interest in contributing!

## Development setup
- Node 18+ recommended
- Install deps: `npm install`
- Web dev server: `npm run dev`
- Web build: `npm run build:web`
- Electron mac dmg (example): `npm run dist:mac-dmg`

## Coding standards
- TypeScript, React 18, Vite
- Tailwind CSS for styling; prefer using the app accent color from preferences
- Keep components focused and accessible; avoid hardcoded colors
- Internationalization via `useAppTranslation` helpers

## Pull Requests
1. Fork and create a feature branch.
2. Write clear commits and keep edits focused.
3. Ensure `npm run build:web` succeeds locally.
4. Add/adjust translations for new UI text.
5. Open a PR and describe the change, screenshots welcome.

## Reporting issues
- Provide reproduction steps and environment info.
- Add screenshots or logs when helpful.

## License
By contributing, you agree your contributions will be licensed under the project’s license.
