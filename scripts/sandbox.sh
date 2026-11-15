#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
sandbox="$root/.sandbox"
store="$sandbox/store"

# Use the real store for .gpg-id even if PASSWORD_STORE_DIR points elsewhere.
# Also clear a leftover test GNUPGHOME so encryption uses the user agent.
unset GNUPGHOME
real_store="${HOME}/.password-store"
if [[ -n "${PASSWORD_STORE_DIR:-}" && -f "${PASSWORD_STORE_DIR}/.gpg-id" && "${PASSWORD_STORE_DIR}" != "${store}" ]]; then
	real_store="${PASSWORD_STORE_DIR}"
fi
gpg_id_file="$real_store/.gpg-id"

if [[ ! -f "$gpg_id_file" ]]; then
	echo "No .gpg-id found at $gpg_id_file. Initialize your real store first." >&2
	exit 1
fi

gpg_id="$(head -n1 "$gpg_id_file" | tr -d '[:space:]')"
if [[ -z "$gpg_id" ]]; then
	echo "Empty .gpg-id in $gpg_id_file" >&2
	exit 1
fi

rm -rf "$sandbox"
mkdir -p "$store"

export PASSWORD_STORE_DIR="$store"
pass init "$gpg_id" >/dev/null

pass insert --multiline --force sandbox/demo <<'EOF'
sandbox-password
username: demo
url: https://example.com
otpauth://totp/Sandbox:demo@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Sandbox&algorithm=SHA1&digits=6&period=30
EOF

pass generate --no-symbols --force sandbox/generated 20 >/dev/null

cat <<EOF
Sandbox store ready at:
  $store

Point the extension's "Password Store Directory" preference to that path,
or run Vicinae with:
  PASSWORD_STORE_DIR=$store

Entries created:
  sandbox/demo
  sandbox/generated
EOF
