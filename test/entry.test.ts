import { describe, expect, it } from "vitest";
import {
	isUsernameFieldKey,
	nonUsernameFields,
	parseEntry,
	parseExtraLines,
	serializeEntry,
	setOtpOnEntry,
} from "../src/pass";

describe("parseEntry", () => {
	it("parses password, fields, otp, and notes", () => {
		const parsed = parseEntry(
			[
				"s3cret",
				"username: alice",
				"url: https://example.com",
				"otpauth://totp/Example:alice?secret=JBSWY3DPEHPK3PXP&issuer=Example",
				"recovery codes below",
			].join("\n"),
		);

		expect(parsed.password).toBe("s3cret");
		expect(parsed.username).toBe("alice");
		expect(parsed.otpauthUri).toContain("otpauth://totp/");
		expect(parsed.fields).toEqual([
			{ key: "username", value: "alice" },
			{ key: "url", value: "https://example.com" },
		]);
		expect(parsed.notes).toEqual(["recovery codes below"]);
	});

	it("treats login and email as username", () => {
		expect(parseEntry("pw\nlogin: bob\n").username).toBe("bob");
		expect(parseEntry("pw\nemail: bob@example.com\n").username).toBe("bob@example.com");
	});
});

describe("nonUsernameFields", () => {
	it("filters username-like keys", () => {
		expect(isUsernameFieldKey("User")).toBe(true);
		expect(isUsernameFieldKey("url")).toBe(false);
		expect(
			nonUsernameFields([
				{ key: "username", value: "alice" },
				{ key: "url", value: "https://example.com" },
				{ key: "email", value: "alice@example.com" },
			]),
		).toEqual([{ key: "url", value: "https://example.com" }]);
	});
});

describe("serializeEntry", () => {
	it("round-trips through parse", () => {
		const raw = serializeEntry({
			password: "s3cret",
			fields: [
				{ key: "username", value: "alice" },
				{ key: "url", value: "https://example.com" },
			],
			otpauthUri: "otpauth://totp/Example:alice?secret=JBSWY3DPEHPK3PXP&issuer=Example",
			notes: ["keep this"],
		});
		const parsed = parseEntry(raw);
		expect(parsed.password).toBe("s3cret");
		expect(parsed.username).toBe("alice");
		expect(parsed.otpauthUri).toContain("otpauth://");
		expect(parsed.notes).toEqual(["keep this"]);
	});
});

describe("setOtpOnEntry", () => {
	it("adds a bare secret as otpauth URI", () => {
		const updated = setOtpOnEntry("password\nusername: alice\n", "JBSWY3DPEHPK3PXP", {
			issuer: "Example",
			account: "alice",
		});
		const parsed = parseEntry(updated);
		expect(parsed.otpauthUri).toContain("otpauth://totp/");
		expect(parsed.otpauthUri).toContain("JBSWY3DPEHPK3PXP");
		expect(parsed.username).toBe("alice");
	});
});

describe("parseExtraLines", () => {
	it("splits fields, otp, and notes", () => {
		const parsed = parseExtraLines(
			"username: alice\notpauth://totp/x?secret=JBSWY3DPEHPK3PXP\nfree note\n",
		);
		expect(parsed.fields).toEqual([{ key: "username", value: "alice" }]);
		expect(parsed.otpauthUri).toContain("otpauth://");
		expect(parsed.notes).toEqual(["free note"]);
	});
});
