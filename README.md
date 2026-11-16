# Norn

A small, self-hosted kanban board for teams: projects, columns you drag cards between, comments with @mentions, time estimates and a notification bell, in one Node process and one SQLite file. More from where it came from: [idunworks.com/projects](https://idunworks.com/projects?utm_source=github&utm_medium=readme&utm_campaign=norn)

<!-- docs/demo.gif: a recording of dragging a card, @mentioning someone, and their bell lighting up. -->

## Install

```bash
git clone https://github.com/idunworks/norn.git && cd norn
cp config.example.env .env   # set ORIGIN, NORN_ALLOWED_EMAILS, NORN_ADMIN_EMAILS, NORN_SMTP_URL
docker compose up -d
```

Then put HTTPS in front of it: see [docs/self-hosting.md](docs/self-hosting.md).

## Try it in 30 seconds

No Docker, no email server. Needs Node 22 and pnpm.

```bash
pnpm install
NORN_ALLOWED_EMAILS=you@example.com NORN_ADMIN_EMAILS=you@example.com pnpm dev
```

Open http://localhost:5173/auth and enter `you@example.com`. In development the sign-in email is
printed in the terminal instead of sent:

```
norn: email to you@example.com (console mailer)
Subject: Your sign-in link for Norn

Sign in to Norn with this link:

http://localhost:5173/auth#token=Xq3v…

It works once and expires in 15 minutes. If you did not ask for it, you can ignore this email.
```

Open that link and press **Sign in**. You'll find a "Getting started" board; make a project of
your own with **New project**, add cards, and drag them between columns. To try mentions, allow
a second address too (`NORN_ALLOWED_EMAILS=you@example.com,friend@example.com`), sign in as them
in a private window, add them to the project, and write `@friend` in a comment.

## Configuration

Everything is set through environment variables; [config.example.env](config.example.env) lists
them all with comments.

| Setting | Default | What it does |
|---|---|---|
| `ORIGIN` | (required in production) | The public `https://` address. Sign-in links point here. |
| `NORN_ALLOWED_EMAILS` | empty: nobody | Who may sign in: addresses and `@domains`, comma-separated. |
| `NORN_ADMIN_EMAILS` | empty: nobody | Who creates projects and sees every board. Must also be allowed. |
| `NORN_SMTP_URL` | none | `smtp://user:pass@host:587` or `smtps://…:465` for sign-in emails. |
| `NORN_MAIL_FROM` | `Norn <norn@localhost>` | The sender of those emails. |
| `NORN_MAIL_CONSOLE` | `false` (`true` in `pnpm dev`) | Print sign-in emails to the log instead. For trying it out only. |
| `NORN_DATABASE` | `./data/norn.db` (`/data/norn.db` in Docker) | The SQLite file. |
| `NORN_LANG` | each visitor's browser | Pin `en` or `sv` for everyone. |
| `ADDRESS_HEADER`, `XFF_DEPTH` | not set | Behind a proxy: where the visitor's address is, for rate limits. |

Who can do what:

- **Admins** create projects and see and manage every board.
- **Owners** of a project manage its columns and members.
- **Members** see only their projects, and add, edit, move and delete cards and comments
  (a comment only its author or an admin can delete). Everyone else gets "not found".
- People are added to a project by email after they have signed in once.

## Turn it off

- **Archive a project:** owners can archive it; it leaves everyone's list.
- **Remove someone:** take their address off `NORN_ALLOWED_EMAILS`. Their sessions end at once,
  and their cards stay, unassigned when you remove them from a project.
- **Stop Norn:** `docker compose down`.
- **Remove it:** `docker compose down -v` deletes the volume, which is everything Norn stored.
  Nothing is left anywhere else: no external services, no analytics, no fonts or scripts from
  other sites.

## How it works

1. Sign-in is an emailed one-time link (no passwords). Only hashes of links and sessions are stored.
2. Every board, card and comment lives in one SQLite file; the schema updates itself on start.
3. The board updates optimistically: a drag, rename or new column shows at once, and goes back,
   with a message, if the server refuses it.
4. `@name` in a comment notifies that project member (first name, full name without spaces, or the
   part of their email before the @). Assigning a card notifies the assignee. Nobody is notified
   of their own actions.

The threat model is in [SECURITY.md](SECURITY.md).

## Built at idunworks

Norn came out of building [Idun CMS](https://idunworks.com/projects?utm_source=github&utm_medium=readme&utm_campaign=norn), the platform behind
idunworks.com and the sites it hosts, where the same board runs as a feature any site can switch on.
More projects: [idunworks.com/projects](https://idunworks.com/projects?utm_source=github&utm_medium=readme&utm_campaign=norn).

[![idunworks](https://img.shields.io/badge/built%20at-idunworks-black)](https://idunworks.com/projects?utm_source=github&utm_medium=badge&utm_campaign=norn)

## License

MIT
