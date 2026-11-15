import { describe, expect, it } from "vitest";
import { summarizeSyncOutput } from "../src/pass/sync";

describe("summarizeSyncOutput", () => {
	it("joins pull and push output", () => {
		expect(
			summarizeSyncOutput({
				pull: { stdout: "Already up to date.\n", stderr: "" },
				push: { stdout: "Everything up-to-date\n", stderr: "" },
			}),
		).toBe("pull: Already up to date. · push: Everything up-to-date");
	});

	it("truncates long output", () => {
		const long = "x".repeat(200);
		const summary = summarizeSyncOutput({
			pull: { stdout: long, stderr: "" },
			push: { stdout: "ok", stderr: "" },
		});
		expect(summary.length).toBeLessThanOrEqual(180);
		expect(summary.endsWith("...")).toBe(true);
	});
});
