# P.A.W. — Personal Agent Workspace

Early-development cross-platform agentic workspace. Electron desktop shell, React/TypeScript controls, Babylon.js spatial world, and a dedicated runtime planned as a separate service.

**Status:** the current interface is a preview. Sample nodes are not real agents; task execution, persistence, and distributed workers are not implemented yet.

## Development
Requires Node.js 20+.

- npm install
- npm run dev
- npm run typecheck
- npm run build

## CI/CD
GitHub Actions runs typechecking and a production build on pushes and pull requests to main. Version tags such as v0.1.0 trigger Linux, Windows and macOS packaging and a GitHub Release.

See docs/REQUIREMENTS.md, docs/ARCHITECTURE.md and docs/ROADMAP.md.
