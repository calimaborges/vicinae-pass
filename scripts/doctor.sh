#!/usr/bin/env bash
set -euo pipefail

ok=0
fail=0

check() {
	local name="$1"
	shift
	if "$@" >/dev/null 2>&1; then
		printf 'ok   %s\n' "$name"
		ok=$((ok + 1))
	else
		printf 'FAIL %s\n' "$name"
		fail=$((fail + 1))
	fi
}

check "pass on PATH" command -v pass
check "gpg on PATH" command -v gpg
check "vicinae on PATH" command -v vicinae
check "vicinae server responds" vicinae ping

if [[ -d "${PASSWORD_STORE_DIR:-$HOME/.password-store}" ]]; then
	printf 'ok   password store directory\n'
	ok=$((ok + 1))
else
	printf 'FAIL password store directory\n'
	fail=$((fail + 1))
fi

printf '\n%d ok, %d failed\n' "$ok" "$fail"
[[ "$fail" -eq 0 ]]
