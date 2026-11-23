import { randomInt } from "node:crypto";
import { PassError } from "./types";

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);
const ALIAS_ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";
const ALIAS_TAG_LENGTH = 8;
const LOCAL_PART = /^[a-z0-9]+(?:\.[a-z0-9]+)*$/;
const ALIAS_TAG = /^[a-z0-9]{4,32}$/;

export function generateGmailAlias(baseEmail: string, tag?: string): string {
	const { local, domain } = parseBaseGmail(baseEmail);
	const aliasTag = (tag ?? randomAliasTag()).toLowerCase();
	if (!ALIAS_TAG.test(aliasTag)) {
		throw new PassError("Alias tag must be 4 to 32 letters or numbers.");
	}
	return `${local}+${aliasTag}@${domain}`;
}

export function upsertEmailLine(extra: string, email: string): string {
	const line = `email: ${email}`;
	const normalized = extra.replace(/\r\n/g, "\n");
	const lines = normalized.split("\n");
	const index = lines.findIndex((entry) => /^email\s*:/i.test(entry.trim()));
	if (index >= 0) {
		lines[index] = line;
		return lines.join("\n");
	}

	const base = normalized.replace(/\n+$/, "");
	if (!base.trim()) {
		return line;
	}
	return `${base}\n${line}`;
}

function parseBaseGmail(baseEmail: string): { local: string; domain: string } {
	const trimmed = baseEmail.trim().toLowerCase();
	const at = trimmed.indexOf("@");
	if (at <= 0 || at !== trimmed.lastIndexOf("@") || at === trimmed.length - 1) {
		throw new PassError("Gmail address must look like name@gmail.com.");
	}

	const domain = trimmed.slice(at + 1);
	if (!GMAIL_DOMAINS.has(domain)) {
		throw new PassError("Gmail address must use gmail.com.");
	}

	const local = trimmed.slice(0, at).split("+")[0] ?? "";
	if (!LOCAL_PART.test(local)) {
		throw new PassError("Gmail address has an invalid name.");
	}

	return { local, domain };
}

function randomAliasTag(): string {
	let tag = "";
	for (let index = 0; index < ALIAS_TAG_LENGTH; index += 1) {
		tag += ALIAS_ALPHABET[randomInt(ALIAS_ALPHABET.length)] ?? "";
	}
	return tag;
}
