import { describe, expect, it } from "vitest";
import { buildPassEnv } from "../src/pass";

describe("buildPassEnv", () => {
	it("prepends extra PATH entries and sets PASSWORD_STORE_DIR", () => {
		const env = buildPassEnv({
			storePath: "/tmp/store",
			extraPath: "/opt/homebrew/bin:/custom/bin",
		});
		expect(env.PASSWORD_STORE_DIR).toBe("/tmp/store");
		expect(env.PATH?.startsWith("/opt/homebrew/bin:/custom/bin:")).toBe(true);
	});
});
