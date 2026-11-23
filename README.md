# vicinae-pass

Native [Vicinae](https://vicinae.com) extension for [password store](https://www.passwordstore.org/) (`pass`).

Manage your GPG-encrypted password store from the launcher on **macOS** and **Linux**, without depending on Raycast compatibility. The extension wraps the `pass` CLI and leaves encryption and `gpg-agent` alone.

## Goals

- Feel native to Vicinae (`@vicinae/api`), not a Raycast port running under compatibility.
- Cover day-to-day CRUD from the launcher: find, copy, create, edit, rename, delete, sync.
- Work the same on macOS and Linux.
- Never ask for or store your GPG passphrase; rely on `gpg-agent` (and Keychain / pinentry on each OS).

## Features

### Browse and copy

- Search entries in `~/.password-store` (or a configured store path)
- Copy password to the clipboard with Vicinae concealed copy (not indexed in clipboard history)
- Paste into the focused app when Vicinae supports it
- Copy username / other multiline fields when present
- Copy or paste a TOTP code from an `otpauth://` line (compatible with `pass-otp`)
- Show entry path and basic metadata in the list

### Create and edit

- Create and edit share one form (`pass insert`) for path, password, and multiline metadata
- Generate Password opens a separate page (Cmd+G) with:
  - **Length** (default from `PASSWORD_STORE_GENERATED_LENGTH`, usually 25)
  - Lowercase, uppercase, numbers, and symbols toggles
  - Ambiguous characters excluded by default (`0 O o 1 l I |`)
- Generate Gmail Alias (Cmd+Shift+E) fills `email: name+random@gmail.com` from the configured Gmail address
- Use Password fills the create/edit form; optionally save and copy with concealed clipboard
- Rename / move an entry (`pass mv`)
- Delete an entry (`pass rm`) with confirmation
- Set or replace an OTP secret (`otpauth://` URI or bare base32 key)

### Sync

- Sync Password Store runs `pass git pull` then `pass git push`
- Requires the store to already be a git repo with a working remote and credentials (SSH agent / credential helper)
- Does not resolve merge conflicts; failures surface in a toast

### Configuration

- Password store directory (default `~/.password-store`)
- Extra `PATH` entries so Homebrew / custom `pass` binaries resolve
- Gmail address used to generate plus aliases (`name+random@gmail.com`)
- Prefer system `gpg-agent`; no GPG passphrase preference field

### Non-goals (for now)

- Replacing `pass` or GPG
- Supporting `gopass` or other stores that are not `pass`-compatible
- Resolving git merge conflicts from inside the extension
- HOTP or QR-code scanning for OTP setup

## Requirements

- [Vicinae](https://vicinae.com) running
- [pass](https://www.passwordstore.org/) configured with your GPG key
- `gpg` / `gpg-agent` available (and pinentry on each OS)
- [mise](https://mise.jdx.dev/) to install Node and build the extension

## Install on a new computer

The extension is not published to a store yet. Install it by building from this repo into Vicinae's local extensions directory.

1. Install Vicinae, `pass`, `gpg` / pinentry, and clone or restore your password store (including GPG key import if needed).
2. Clone this repository and build:

```bash
git clone https://github.com/calimaborges/vicinae-pass.git

cd vicinae-pass
mise trust
mise install
mise run doctor
mise run build
```

`mise run build` writes the extension to `~/.local/share/vicinae/extensions/password-store`.

3. Start (or restart) Vicinae and search for **Search Passwords**, **Create Password**, or **Sync Password Store**.
4. Open extension preferences if needed:
   - **Password Store Directory** — default `~/.password-store`
   - **Additional PATH Entries** — e.g. `/opt/homebrew/bin:/usr/local/bin` so GUI Vicinae can find Homebrew `pass` / `gpg`
   - **Gmail Address** — base inbox for Generate Gmail Alias, e.g. `you@gmail.com`

To update later, pull the latest commits and run `mise run build` again.

## Development

```bash
mise trust
mise install
mise run doctor
mise run sandbox   # optional throwaway store under .sandbox/store
mise run dev       # requires Vicinae running
```

Useful tasks:

| Task | Purpose |
| --- | --- |
| `mise run install` | Install dependencies with pnpm |
| `mise run dev` | Live-reload the extension into Vicinae |
| `mise run build` | Production build into Vicinae's extensions directory |
| `mise run test` | Unit + integration tests |
| `mise run lint` | Manifest validation + Biome |
| `mise run doctor` | Check `pass`, `gpg`, and `vicinae` |
| `mise run sandbox` | Create a disposable store for manual testing |

Point the extension preference **Password Store Directory** at `.sandbox/store` while developing so your real vault is never touched.

## Status

Implemented. TypeScript / React with `@vicinae/api`, wrapping the `pass` CLI. OTP codes are computed in-process from `otpauth://` lines (compatible with `pass-otp`).

## License

MIT
