import { afterEach, describe, expect, it } from "vitest";
import {
	generatePassword,
	generateTotpFromUri,
	insertEntry,
	listEntries,
	moveEntry,
	PassEntryExistsError,
	removeEntry,
	serializeEntry,
	setOtpOnEntry,
	showEntry,
} from "../src/pass";
import {
	canRunPassIntegration,
	createTempPassStore,
	runWithGnupgHome,
	type TempPassStore,
} from "./helpers/gpg-store";

const enabled = await canRunPassIntegration();
const temps: TempPassStore[] = [];

afterEach(async () => {
	await Promise.all(temps.splice(0).map((temp) => temp.cleanup()));
});

describe.skipIf(!enabled)("pass operations integration", () => {
	it("inserts, shows, edits, moves, and removes entries", async () => {
		const temp = await createTempPassStore();
		temps.push(temp);

		await runWithGnupgHome(temp.gnupgHome, async () => {
			await insertEntry(
				temp.config,
				"personal/demo",
				"demo-password\nusername: alice\nurl: https://example.com\n",
			);

			const shown = await showEntry(temp.config, "personal/demo");
			expect(shown.password).toBe("demo-password");
			expect(shown.username).toBe("alice");

			await expect(insertEntry(temp.config, "personal/demo", "other\n")).rejects.toBeInstanceOf(
				PassEntryExistsError,
			);

			const generated = generatePassword({
				length: 20,
				lowercase: true,
				uppercase: true,
				numbers: true,
				symbols: false,
				excludeAmbiguous: false,
			});
			expect(generated).toMatch(/^[A-Za-z0-9]{20}$/);
			await insertEntry(temp.config, "personal/generated", `${generated}\n`);
			const generatedEntry = await showEntry(temp.config, "personal/generated");
			expect(generatedEntry.password).toBe(generated);

			await moveEntry(temp.config, "personal/demo", "personal/renamed");
			const renamed = await showEntry(temp.config, "personal/renamed");
			expect(renamed.password).toBe("demo-password");

			const withOtp = setOtpOnEntry(renamed.raw, "JBSWY3DPEHPK3PXP", {
				issuer: "Example",
				account: "alice",
			});
			await insertEntry(temp.config, "personal/renamed", withOtp, { force: true });
			const otpEntry = await showEntry(temp.config, "personal/renamed");
			expect(otpEntry.otpauthUri).toContain("otpauth://totp/");
			expect(otpEntry.otpauthUri).toBeTruthy();
			const code = generateTotpFromUri(otpEntry.otpauthUri as string);
			expect(code.code).toMatch(/^\d{6}$/);

			const regenerated = generatePassword({
				length: 16,
				lowercase: true,
				uppercase: true,
				numbers: true,
				symbols: false,
				excludeAmbiguous: false,
			});
			expect(regenerated).toMatch(/^[A-Za-z0-9]{16}$/);
			await insertEntry(
				temp.config,
				"personal/renamed",
				serializeEntry({
					password: regenerated,
					fields: otpEntry.fields,
					otpauthUri: otpEntry.otpauthUri,
					notes: otpEntry.notes,
				}),
				{ force: true },
			);
			const afterRegen = await showEntry(temp.config, "personal/renamed");
			expect(afterRegen.password).toBe(regenerated);
			expect(afterRegen.otpauthUri).toContain("otpauth://");

			await removeEntry(temp.config, "personal/renamed");
			const entries = await listEntries(temp.config);
			expect(entries.map((entry) => entry.path)).toEqual(["personal/generated"]);
		});
	}, 120_000);
});
