import { normalizeOtpInput } from "./otp";
import type { EntryField, ParsedEntry } from "./types";

const USERNAME_KEYS = new Set(["username", "user", "login", "email"]);

export function isUsernameFieldKey(key: string): boolean {
	return USERNAME_KEYS.has(key.toLowerCase());
}

export function nonUsernameFields(fields: EntryField[]): EntryField[] {
	let skippedPrimaryUsername = false;
	return fields.filter((field) => {
		if (!skippedPrimaryUsername && isUsernameFieldKey(field.key)) {
			skippedPrimaryUsername = true;
			return false;
		}
		return true;
	});
}

export function parseEntry(raw: string): ParsedEntry {
	const normalized = raw.replace(/\r\n/g, "\n");
	const lines = normalized.split("\n");
	const password = lines[0] ?? "";
	const fields: EntryField[] = [];
	const notes: string[] = [];
	let username: string | null = null;
	let otpauthUri: string | null = null;

	for (const rawLine of lines.slice(1)) {
		const trimmed = rawLine.trim();
		if (!trimmed) {
			continue;
		}

		if (trimmed.toLowerCase().startsWith("otpauth://")) {
			otpauthUri = trimmed;
			continue;
		}

		const separator = trimmed.indexOf(":");
		if (separator === -1) {
			notes.push(trimmed);
			continue;
		}

		const key = trimmed.slice(0, separator).trim();
		const value = trimmed.slice(separator + 1).trim();
		if (!key) {
			notes.push(trimmed);
			continue;
		}

		fields.push({ key, value });
		if (!username && USERNAME_KEYS.has(key.toLowerCase())) {
			username = value;
		}
	}

	return {
		password,
		username,
		otpauthUri,
		fields,
		notes,
		raw: normalized,
	};
}

export function serializeEntry(parts: {
	password: string;
	fields?: EntryField[];
	otpauthUri?: string | null;
	notes?: string[];
}): string {
	const lines: string[] = [parts.password ?? ""];

	for (const field of parts.fields ?? []) {
		const key = field.key.trim();
		if (!key) {
			continue;
		}
		lines.push(`${key}: ${field.value.trim()}`);
	}

	if (parts.otpauthUri) {
		lines.push(parts.otpauthUri.trim());
	}

	for (const note of parts.notes ?? []) {
		const trimmed = note.trim();
		if (trimmed) {
			lines.push(trimmed);
		}
	}

	return `${lines.join("\n")}\n`;
}

export function setOtpOnEntry(
	raw: string,
	secretOrUri: string,
	meta?: { issuer?: string; account?: string },
): string {
	const parsed = parseEntry(raw);
	const uri = normalizeOtpInput(secretOrUri, {
		issuer: meta?.issuer,
		account: meta?.account ?? parsed.username ?? undefined,
	});
	return serializeEntry({
		password: parsed.password,
		fields: parsed.fields,
		otpauthUri: uri,
		notes: parsed.notes,
	});
}

export function parseExtraLines(extra: string): {
	fields: EntryField[];
	otpauthUri: string | null;
	notes: string[];
} {
	const fields: EntryField[] = [];
	const notes: string[] = [];
	let otpauthUri: string | null = null;

	for (const rawLine of extra.replace(/\r\n/g, "\n").split("\n")) {
		const trimmed = rawLine.trim();
		if (!trimmed) {
			continue;
		}
		if (trimmed.toLowerCase().startsWith("otpauth://")) {
			otpauthUri = trimmed;
			continue;
		}
		const separator = trimmed.indexOf(":");
		if (separator === -1) {
			notes.push(trimmed);
			continue;
		}
		const key = trimmed.slice(0, separator).trim();
		const value = trimmed.slice(separator + 1).trim();
		if (!key) {
			notes.push(trimmed);
			continue;
		}
		fields.push({ key, value });
	}

	return { fields, otpauthUri, notes };
}
