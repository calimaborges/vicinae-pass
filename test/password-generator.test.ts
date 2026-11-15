import { afterEach, describe, expect, it } from "vitest";
import { defaultPasswordLength, generatePassword } from "../src/pass/password-generator";
import { PassError } from "../src/pass/types";

const previousLength = process.env.PASSWORD_STORE_GENERATED_LENGTH;

afterEach(() => {
	if (previousLength === undefined) {
		delete process.env.PASSWORD_STORE_GENERATED_LENGTH;
	} else {
		process.env.PASSWORD_STORE_GENERATED_LENGTH = previousLength;
	}
});

describe("defaultPasswordLength", () => {
	it("defaults to 25", () => {
		delete process.env.PASSWORD_STORE_GENERATED_LENGTH;
		expect(defaultPasswordLength()).toBe(25);
	});

	it("reads PASSWORD_STORE_GENERATED_LENGTH", () => {
		process.env.PASSWORD_STORE_GENERATED_LENGTH = "32";
		expect(defaultPasswordLength()).toBe(32);
	});
});

describe("generatePassword", () => {
	it("returns the requested length", () => {
		const password = generatePassword({
			length: 24,
			lowercase: true,
			uppercase: true,
			numbers: true,
			symbols: true,
			excludeAmbiguous: false,
		});
		expect(password).toHaveLength(24);
	});

	it("includes at least one character from each enabled class", () => {
		for (let attempt = 0; attempt < 20; attempt += 1) {
			const password = generatePassword({
				length: 12,
				lowercase: true,
				uppercase: true,
				numbers: true,
				symbols: true,
				excludeAmbiguous: false,
			});
			expect(password).toMatch(/[a-z]/);
			expect(password).toMatch(/[A-Z]/);
			expect(password).toMatch(/[0-9]/);
			expect(password).toMatch(/[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/);
		}
	});

	it("respects disabled character classes", () => {
		const password = generatePassword({
			length: 20,
			lowercase: true,
			uppercase: false,
			numbers: false,
			symbols: false,
			excludeAmbiguous: false,
		});
		expect(password).toMatch(/^[a-z]+$/);
	});

	it("excludes ambiguous characters when requested", () => {
		for (let attempt = 0; attempt < 20; attempt += 1) {
			const password = generatePassword({
				length: 40,
				lowercase: true,
				uppercase: true,
				numbers: true,
				symbols: true,
				excludeAmbiguous: true,
			});
			expect(password).not.toMatch(/[0Oo1lI|]/);
		}
	});

	it("rejects when no class is enabled", () => {
		expect(() =>
			generatePassword({
				length: 10,
				lowercase: false,
				uppercase: false,
				numbers: false,
				symbols: false,
				excludeAmbiguous: false,
			}),
		).toThrow(PassError);
	});

	it("rejects when length is smaller than enabled classes", () => {
		expect(() =>
			generatePassword({
				length: 2,
				lowercase: true,
				uppercase: true,
				numbers: true,
				symbols: false,
				excludeAmbiguous: false,
			}),
		).toThrow(PassError);
	});

	it("rejects invalid length", () => {
		expect(() =>
			generatePassword({
				length: 0,
				lowercase: true,
				uppercase: false,
				numbers: false,
				symbols: false,
				excludeAmbiguous: false,
			}),
		).toThrow(PassError);
	});
});
