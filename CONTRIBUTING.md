# Contributing to OpenChat

Thanks for your interest in contributing! This document explains how to set up
the project locally and the workflow we follow for changes.

## Development setup

1. Fork and clone the repository.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the example environment file and fill in your own values:

   ```bash
   cp .env.example .env.local
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

The app runs at [http://localhost:3000](http://localhost:3000).

## Branching and commits

- Create a feature branch off `main` (e.g. `feat/thread-reactions`).
- Keep commits focused and write clear, imperative commit messages
  (`feat: add scheduled messages`, `fix: handle empty channel list`).
- Rebase on the latest `main` before opening a pull request.

## Code style

- The project uses TypeScript, ESLint and Prettier defaults.
- Run the linter before pushing:

  ```bash
  npm run lint
  ```

- Prefer small, composable React components and keep server logic in the
  `src/app/api` route handlers.

## Pull requests

- Fill out the pull request template.
- Reference any related issues.
- Make sure the build passes (`npm run build`) and there are no lint errors.
- A maintainer will review your PR and may request changes before merging.

## Reporting bugs and requesting features

Please use the issue templates under `.github/ISSUE_TEMPLATE` when opening an
issue. Include steps to reproduce, expected behaviour and screenshots where
relevant.

By contributing you agree that your contributions will be licensed under the
same license as the project.
