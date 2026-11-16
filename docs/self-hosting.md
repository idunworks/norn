# Running Norn on your own server

Norn is one Node process and one SQLite file. Put it behind a TLS proxy, give it a way to send
email, and back up one volume.

## 1. Configure

```bash
cp config.example.env .env
```

Set at least `ORIGIN`, `NORN_ALLOWED_EMAILS`, `NORN_ADMIN_EMAILS` and `NORN_SMTP_URL`. Every
setting is explained in [config.example.env](../config.example.env).

## 2. Start it

```bash
docker compose up -d
```

The compose file publishes port 3000 on `127.0.0.1` only, runs the container as a non-root user
with a read-only filesystem and no Linux capabilities, and keeps the database in the
`norn-data` volume.

Without Docker: Node 22.17 or newer, then `pnpm install && pnpm build && node build`, with the same settings
in the environment.

## 3. Put HTTPS in front

Serve Norn over HTTPS: the session cookie is only marked `Secure` (and `__Host-`) there. Any
reverse proxy works. With Caddy:

```
norn.example.com {
	reverse_proxy 127.0.0.1:3000
}
```

With nginx, pass the visitor's address on:

```nginx
location / {
	proxy_pass http://127.0.0.1:3000;
	proxy_set_header Host $host;
	proxy_set_header X-Forwarded-For $remote_addr;
	proxy_set_header X-Forwarded-Proto https;
}
```

### The visitor's address

Rate limits count per visitor. Behind a proxy, Norn only sees the proxy, so tell it which header
carries the real address:

```
ADDRESS_HEADER=X-Forwarded-For
XFF_DEPTH=1
```

`XFF_DEPTH` is the number of proxies you run in front of Norn. Set `ADDRESS_HEADER` only when a
proxy you control always sets that header; otherwise a visitor could write their own and dodge
the limit.

## 4. Email

`NORN_SMTP_URL` takes a normal SMTP URL: `smtp://user:pass@host:587` (STARTTLS) or
`smtps://user:pass@host:465`. URL-encode special characters in the password. Set
`NORN_MAIL_FROM` to an address your mail provider lets you send from, and set up SPF and DKIM for
its domain, or sign-in links will land in spam.

To try Norn without email, `NORN_MAIL_CONSOLE=true` prints the sign-in links to the log
(`docker compose logs norn`). Turn it off before anyone else can read that log.

## 5. People and projects

1. Put everyone's address (or your `@domain`) in `NORN_ALLOWED_EMAILS`, and yours in
   `NORN_ADMIN_EMAILS`, then restart.
2. Each person signs in once; that creates their account. They can set the name others
   @mention on **Account**.
3. An admin creates a project and adds people by email, as members or owners.

## 6. Backups

Everything is in the `norn-data` volume: `norn.db` and, while it runs, `norn.db-wal`. To take a
consistent copy without stopping Norn:

```bash
docker compose exec norn node -e "require('better-sqlite3')('/data/norn.db').backup('/data/backup.db').then(() => console.log('ok'))"
docker compose cp norn:/data/backup.db ./norn-backup.db
```

A backup holds every board, card and comment in the clear. Keep it as safe as the server.

## 7. Updating

```bash
git pull && docker compose up -d --build
```

The database schema updates itself on start.

## Turning it off

`docker compose down` stops it. `docker compose down -v` also deletes the volume, and with it
every board and session.
