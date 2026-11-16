# Security

## Reporting a problem

Please report security problems privately, through this repository's
**Security → Report a vulnerability** button on GitHub. Don't open a public issue.
You'll get an answer within a week.

## What Norn protects, and what it doesn't

Norn holds a team's plans: project names, cards, comments and who works on what. It is built
so that only the people you let in can see a board, and only the boards they are on.

### Access

- Only addresses on `NORN_ALLOWED_EMAILS` can sign in, and every address gets the same answer.
  Taking an address off the list ends its sessions on the next request.
- A board is visible to its members and to admins (`NORN_ADMIN_EMAILS`). Anyone else gets
  "not found", so they can't even tell it exists. Every card, column and comment is checked
  against the project in the address, so an id from another board does nothing.
- Owners and admins manage columns and members; a project always keeps an owner.

### Sign-in

- Sign-in links work once, for 15 minutes, and travel in the `#fragment`; a button press spends
  them, so mail scanners that open every link can't. Only hashes are stored.
- Sessions are random ids in an `httpOnly`, `SameSite=Lax` cookie (`__Host-` prefixed over
  HTTPS), stored as hashes, ended at sign-out on the server too. Lax lets a link from an email
  open a board signed in; every request that changes something must come from Norn's own pages
  (the `Origin` header is checked).
- Links in the emails are built from `ORIGIN`, never from the request's `Host` header.
- Requests for links, emails per address and sign-in attempts are rate limited.

### The pages

- A strict Content-Security-Policy: scripts and styles only from Norn itself (inline style
  attributes are allowed for avatar sizes and drag-and-drop), no frames, no other sites.
- No third-party requests of any kind: no analytics, fonts, CDNs or telemetry.

### What Norn can't protect against

- **An inbox taken over.** Sign-in is by emailed link, so whoever reads someone's mail can sign
  in as them and see their boards.
- **A compromised server.** The database is not encrypted at rest. Whoever can read the volume
  or its backups can read every board. Protect them like the boards themselves.
- **Metadata in logs.** The server sees visitors' IP addresses (for rate limits) and what they
  ask for; card titles appear in notifications and search.
