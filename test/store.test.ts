import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { listEntries, PassStoreMissingError } from "../src/pass";

const temps: string[] = [];

afterEach(async () => {
	await Promise.all(temps.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function makeTempStore(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vicinae-pass-store-"));
	temps.push(dir);
	await fs.mkdir(path.join(dir, "personal"), { recursive: true });
	await fs.writeFile(path.join(dir, "personal", "demo.gpg"), "fake");
	await fs.writeFile(path.join(dir, "root.gpg"), "fake");
	await fs.mkdir(path.join(dir, ".git"), { recursive: true });
	await fs.writeFile(path.join(dir, ".git", "config"), "ignored");
	return dir;
}

describe("listEntries", () => {
	it("lists gpg entries and skips dot directories", async () => {
		const storePath = await makeTempStore();
		const entries = await listEntries({ storePath, extraPath: "" });
		expect(entries.map((entry) => entry.path).sort()).toEqual(["personal/demo", "root"]);
		expect(entries.find((entry) => entry.path === "personal/demo")?.folder).toBe("personal");
	});

	it("throws when the store is missing", async () => {
		await expect(
			listEntries({ storePath: path.join(os.tmpdir(), "missing-pass-store"), extraPath: "" }),
		).rejects.toBeInstanceOf(PassStoreMissingError);
	});
});
