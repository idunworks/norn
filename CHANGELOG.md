# Changelog

## 0.1.1 (2026-11-16)

- SvelteKit 3 (with Vite 8). This clears GitHub's security alerts for SvelteKit 2; none of them
  touched Norn, which uses no remote functions, prerendering or form actions.
- Needs Node 22.17 or newer (the Docker image already has it).
- Settings and behaviour are unchanged, `ORIGIN` included.

## 0.1.0 (2026-11-16)

The first release.

- Projects with columns you can add, rename, reorder, mark as done and delete when empty.
- Cards (tasks and bugs) with a description, assignee, due date, estimate and time spent;
  drag them within and between columns, or move them from the card's dialog with the keyboard.
- Comments with @mentions, an activity log per card, a notification bell, and search.
- Sign-in by emailed one-time link, limited to an allowlist; admins and per-project owners.
- English and Swedish, light and dark.
