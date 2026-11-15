import { describe, expect, it } from "vitest";
import {
	buildOtpauthUri,
	decodeBase32,
	generateTotpCode,
	generateTotpFromUri,
	normalizeOtpInput,
	OtpError,
	parseOtpauthUri,
} from "../src/pass";

// RFC 6238 Appendix B test vectors (seed = "12345678901234567890" / SHA1 key)
const RFC_SECRET_SHA1 = Buffer.from("12345678901234567890");
const RFC_SECRET_SHA256 = Buffer.from("12345678901234567890123456789012");
const RFC_SECRET_SHA512 = Buffer.from(
	"1234567890123456789012345678901234567890123456789012345678901234",
);

describe("decodeBase32", () => {
	it("decodes a known secret", () => {
		expect(decodeBase32("JBSWY3DPEHPK3PXP")).toEqual(
			Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x21, 0xde, 0xad, 0xbe, 0xef]),
		);
	});

	it("rejects invalid input", () => {
		expect(() => decodeBase32("@@@@")).toThrow(OtpError);
		expect(() => decodeBase32("")).toThrow(OtpError);
	});
});

describe("parseOtpauthUri", () => {
	it("parses totp parameters", () => {
		const params = parseOtpauthUri(
			"otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example&algorithm=SHA1&digits=6&period=30",
		);
		expect(params.algorithm).toBe("SHA1");
		expect(params.digits).toBe(6);
		expect(params.period).toBe(30);
		expect(params.issuer).toBe("Example");
		expect(params.account).toBe("alice@example.com");
	});

	it("rejects hotp", () => {
		expect(() =>
			parseOtpauthUri("otpauth://hotp/Example:alice?secret=JBSWY3DPEHPK3PXP&counter=1"),
		).toThrow(/HOTP/);
	});
});

describe("generateTotpCode", () => {
	it("matches RFC 6238 SHA1 vectors", () => {
		const cases: Array<[number, string]> = [
			[59, "94287082"],
			[1111111109, "07081804"],
			[1111111111, "14050471"],
			[1234567890, "89005924"],
			[2000000000, "69279037"],
			[20000000000, "65353130"],
		];
		for (const [epoch, expected] of cases) {
			const result = generateTotpCode(
				{
					secret: RFC_SECRET_SHA1,
					algorithm: "SHA1",
					digits: 8,
					period: 30,
					issuer: null,
					account: null,
					uri: "",
				},
				epoch * 1000,
			);
			expect(result.code).toBe(expected);
		}
	});

	it("matches RFC 6238 SHA256 and SHA512 vectors at T=59", () => {
		expect(
			generateTotpCode(
				{
					secret: RFC_SECRET_SHA256,
					algorithm: "SHA256",
					digits: 8,
					period: 30,
					issuer: null,
					account: null,
					uri: "",
				},
				59_000,
			).code,
		).toBe("46119246");

		expect(
			generateTotpCode(
				{
					secret: RFC_SECRET_SHA512,
					algorithm: "SHA512",
					digits: 8,
					period: 30,
					issuer: null,
					account: null,
					uri: "",
				},
				59_000,
			).code,
		).toBe("90693936");
	});
});

describe("normalizeOtpInput", () => {
	it("accepts URIs and bare secrets", () => {
		const uri = buildOtpauthUri({
			secret: "JBSWY3DPEHPK3PXP",
			issuer: "Example",
			account: "alice",
		});
		expect(normalizeOtpInput(uri)).toBe(uri);
		expect(
			normalizeOtpInput("JBSWY3DPEHPK3PXP", { issuer: "Example", account: "alice" }),
		).toContain("otpauth://totp/");
	});

	it("generates a working code from a bare secret", () => {
		const uri = normalizeOtpInput("JBSWY3DPEHPK3PXP", { issuer: "Example", account: "alice" });
		const code = generateTotpFromUri(uri);
		expect(code.code).toMatch(/^\d{6}$/);
		expect(code.remainingSeconds).toBeGreaterThan(0);
	});
});
