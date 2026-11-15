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
- [mise](https://mise.jdx.dev/) for development tooling

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
| `mise run install` | Install npm dependencies |
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
