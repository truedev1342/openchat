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
