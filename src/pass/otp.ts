import { createHmac, timingSafeEqual } from "node:crypto";
import { OtpError } from "./types";

export type TotpAlgorithm = "SHA1" | "SHA256" | "SHA512";

export type TotpParams = {
	secret: Buffer;
	algorithm: TotpAlgorithm;
	digits: number;
	period: number;
	issuer: string | null;
	account: string | null;
	uri: string;
};

export type TotpCode = {
	code: string;
	remainingSeconds: number;
	period: number;
};

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function decodeBase32(input: string): Buffer {
	const normalized = input.replace(/[\s=-]+/g, "").toUpperCase();
	if (!normalized) {
		throw new OtpError("OTP secret is empty.");
	}
	if (!/^[A-Z2-7]+$/.test(normalized)) {
		throw new OtpError("OTP secret is not valid base32.");
	}

	let bits = 0;
	let value = 0;
	const bytes: number[] = [];

	for (const char of normalized) {
		const index = BASE32_ALPHABET.indexOf(char);
		value = (value << 5) | index;
		bits += 5;
		if (bits >= 8) {
			bytes.push((value >>> (bits - 8)) & 0xff);
			bits -= 8;
		}
	}

	return Buffer.from(bytes);
}

export function parseOtpauthUri(uri: string): TotpParams {
	const trimmed = uri.trim();
	let parsed: URL;
	try {
		parsed = new URL(trimmed);
	} catch {
		throw new OtpError("Invalid otpauth URI.");
	}

	if (parsed.protocol !== "otpauth:") {
		throw new OtpError("OTP URI must use the otpauth scheme.");
	}

	const type = parsed.hostname.toLowerCase();
	if (type === "hotp") {
		throw new OtpError("HOTP entries are not supported. Use TOTP instead.");
	}
	if (type !== "totp") {
		throw new OtpError(`Unsupported OTP type "${type}".`);
	}

	const secretParam = parsed.searchParams.get("secret");
	if (!secretParam) {
		throw new OtpError("otpauth URI is missing a secret.");
	}

	const algorithmRaw = (parsed.searchParams.get("algorithm") || "SHA1").toUpperCase();
	if (algorithmRaw !== "SHA1" && algorithmRaw !== "SHA256" && algorithmRaw !== "SHA512") {
		throw new OtpError(`Unsupported OTP algorithm "${algorithmRaw}".`);
	}

	const digits = Number.parseInt(parsed.searchParams.get("digits") || "6", 10);
	if (![6, 7, 8].includes(digits)) {
		throw new OtpError(`Unsupported OTP digits "${digits}".`);
	}

	const period = Number.parseInt(parsed.searchParams.get("period") || "30", 10);
	if (!Number.isFinite(period) || period <= 0) {
		throw new OtpError(`Invalid OTP period "${period}".`);
	}

	const label = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
	let issuer = parsed.searchParams.get("issuer");
	let account: string | null = label || null;
	if (label.includes(":")) {
		const [labelIssuer, ...rest] = label.split(":");
		issuer = issuer || labelIssuer || null;
		account = rest.join(":").trim() || null;
	}

	return {
		secret: decodeBase32(secretParam),
		algorithm: algorithmRaw,
		digits,
		period,
		issuer: issuer || null,
		account,
		uri: trimmed,
	};
}

export function buildOtpauthUri(options: {
	secret: string;
	issuer?: string;
	account?: string;
	algorithm?: TotpAlgorithm;
	digits?: number;
	period?: number;
}): string {
	const secret = options.secret.replace(/[\s=-]+/g, "").toUpperCase();
	decodeBase32(secret);

	const algorithm = options.algorithm ?? "SHA1";
	const digits = options.digits ?? 6;
	const period = options.period ?? 30;
	const issuer = options.issuer?.trim() || "";
	const account = options.account?.trim() || "account";
	const label = issuer
		? `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`
		: encodeURIComponent(account);

	const params = new URLSearchParams({
		secret,
		algorithm,
		digits: String(digits),
		period: String(period),
	});
	if (issuer) {
		params.set("issuer", issuer);
	}

	return `otpauth://totp/${label}?${params.toString()}`;
}

export function normalizeOtpInput(
	input: string,
	meta?: { issuer?: string; account?: string },
): string {
	const trimmed = input.trim();
	if (!trimmed) {
		throw new OtpError("OTP secret is empty.");
	}
	if (trimmed.toLowerCase().startsWith("otpauth://")) {
		parseOtpauthUri(trimmed);
		return trimmed;
	}
	return buildOtpauthUri({
		secret: trimmed,
		issuer: meta?.issuer,
		account: meta?.account,
	});
}

function hotp(secret: Buffer, counter: number, algorithm: TotpAlgorithm, digits: number): string {
	const counterBuffer = Buffer.alloc(8);
	counterBuffer.writeBigUInt64BE(BigInt(counter));

	const digestName = algorithm.toLowerCase();
	const hmac = createHmac(digestName, secret).update(counterBuffer).digest();
	const offset = hmac[hmac.length - 1] & 0x0f;
	const binary =
		((hmac[offset] & 0x7f) << 24) |
		((hmac[offset + 1] & 0xff) << 16) |
		((hmac[offset + 2] & 0xff) << 8) |
		(hmac[offset + 3] & 0xff);
	const otp = binary % 10 ** digits;
	return otp.toString().padStart(digits, "0");
}

export function generateTotpCode(params: TotpParams, nowMs: number = Date.now()): TotpCode {
	const counter = Math.floor(nowMs / 1000 / params.period);
	const remainingSeconds = params.period - (Math.floor(nowMs / 1000) % params.period);
	return {
		code: hotp(params.secret, counter, params.algorithm, params.digits),
		remainingSeconds: remainingSeconds === 0 ? params.period : remainingSeconds,
		period: params.period,
	};
}

export function generateTotpFromUri(uri: string, nowMs: number = Date.now()): TotpCode {
	return generateTotpCode(parseOtpauthUri(uri), nowMs);
}

export function codesEqual(a: string, b: string): boolean {
	const left = Buffer.from(a);
	const right = Buffer.from(b);
	if (left.length !== right.length) {
		return false;
	}
	return timingSafeEqual(left, right);
}
