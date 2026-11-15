import { describe, expect, it } from "vitest";
import { expandHomePath, PassInvalidPathError, validateEntryPath } from "../src/pass";

describe("validateEntryPath", () => {
	it("normalizes relative paths", () => {
		expect(validateEntryPath(" personal/example.com ")).toBe("personal/example.com");
	});

	it("rejects empty, absolute, and traversal paths", () => {
		expect(() => validateEntryPath("")).toThrow(PassInvalidPathError);
		expect(() => validateEntryPath("/etc/passwd")).toThrow(PassInvalidPathError);
		expect(() => validateEntryPath("../secret")).toThrow(PassInvalidPathError);
		expect(() => validateEntryPath("foo/../bar")).toThrow(PassInvalidPathError);
		expect(() => validateEntryPath("foo.gpg")).toThrow(PassInvalidPathError);
	});
});

describe("expandHomePath", () => {
	it("expands ~", () => {
		expect(expandHomePath("~")).toMatch(/./);
		expect(expandHomePath("~/password-store").endsWith("password-store")).toBe(true);
	});
});
