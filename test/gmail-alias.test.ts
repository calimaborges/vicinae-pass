import { describe, expect, it } from "vitest";
import { generateGmailAlias, upsertEmailLine } from "../src/pass/gmail-alias";
import { PassError } from "../src/pass/types";

describe("generateGmailAlias", () => {
	it("builds a plus alias from the configured Gmail address", () => {
		expect(generateGmailAlias("calimaborges@gmail.com", "k7m2p9qx")).toBe(
			"calimaborges+k7m2p9qx@gmail.com",
		);
	});

	it("strips an existing plus tag and keeps googlemail.com", () => {
		expect(generateGmailAlias("  CaliMaBorges+old@GoogleMail.com  ", "ab12")).toBe(
			"calimaborges+ab12@googlemail.com",
		);
	});

	it("preserves dots in the mailbox name", () => {
		expect(generateGmailAlias("calima.borges@gmail.com", "abcd")).toBe(
			"calima.borges+abcd@gmail.com",
		);
	});

	it("generates a random tag when none is provided", () => {
		const alias = generateGmailAlias("calimaborges@gmail.com");
		expect(alias).toMatch(/^calimaborges\+[a-z0-9]{8}@gmail.com$/);
	});

	it("rejects an address that is not Gmail", () => {
		expect(() => generateGmailAlias("ada@example.com", "abcd")).toThrow(PassError);
	});

	it("rejects a malformed address", () => {
		expect(() => generateGmailAlias("calimaborges", "abcd")).toThrow(PassError);
		expect(() => generateGmailAlias("@gmail.com", "abcd")).toThrow(PassError);
	});
});

describe("upsertEmailLine", () => {
	it("starts an email line when extra is empty", () => {
		expect(upsertEmailLine("", "calimaborges+abcd@gmail.com")).toBe(
			"email: calimaborges+abcd@gmail.com",
		);
		expect(upsertEmailLine("\n", "calimaborges+abcd@gmail.com")).toBe(
			"email: calimaborges+abcd@gmail.com",
		);
	});

	it("appends an email line after existing fields", () => {
		expect(upsertEmailLine("url: https://example.com\n", "calimaborges+abcd@gmail.com")).toBe(
			"url: https://example.com\nemail: calimaborges+abcd@gmail.com",
		);
	});

	it("replaces the first email line", () => {
		expect(
			upsertEmailLine(
				"username: alice\nEmail: old@gmail.com\nurl: https://example.com",
				"calimaborges+abcd@gmail.com",
			),
		).toBe("username: alice\nemail: calimaborges+abcd@gmail.com\nurl: https://example.com");
	});
});
