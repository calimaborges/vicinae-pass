import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { PassConfig } from "../../src/pass";

const execFileAsync = promisify(execFile);

export type TempPassStore = {
	config: PassConfig;
	storePath: string;
	gnupgHome: string;
	cleanup: () => Promise<void>;
};

async function commandExists(binary: string): Promise<boolean> {
	try {
		await execFileAsync("which", [binary]);
		return true;
	} catch {
		return false;
	}
}

export async function canRunPassIntegration(): Promise<boolean> {
	return (await commandExists("pass")) && (await commandExists("gpg"));
}

function gpgEnv(gnupgHome: string, storePath?: string): NodeJS.ProcessEnv {
	return {
		...process.env,
		GNUPGHOME: gnupgHome,
		PASSWORD_STORE_DIR: storePath ?? process.env.PASSWORD_STORE_DIR,
		PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || ""}`,
	};
}

export async function createTempPassStore(): Promise<TempPassStore> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "vicinae-pass-int-"));
	const storePath = path.join(root, "store");
	const gnupgHome = path.join(root, "gnupg");
	await fs.mkdir(storePath, { mode: 0o700 });
	await fs.mkdir(gnupgHome, { mode: 0o700 });
	await fs.writeFile(path.join(gnupgHome, "gpg.conf"), "pinentry-mode loopback\n", {
		mode: 0o600,
	});
	await fs.writeFile(path.join(gnupgHome, "gpg-agent.conf"), "allow-loopback-pinentry\n", {
		mode: 0o600,
	});

	await execFileAsync("gpgconf", ["--launch", "gpg-agent"], {
		env: gpgEnv(gnupgHome),
		timeout: 15_000,
	});

	await execFileAsync(
		"gpg",
		[
			"--batch",
			"--pinentry-mode",
			"loopback",
			"--passphrase",
			"",
			"--quick-generate-key",
			"Vicinae Pass Test <vicinae-pass-test@example.com>",
			"ed25519",
			"cert,sign",
			"never",
		],
		{
			env: gpgEnv(gnupgHome),
			timeout: 30_000,
		},
	);

	const { stdout } = await execFileAsync(
		"gpg",
		["--batch", "--with-colons", "--list-secret-keys"],
		{ env: gpgEnv(gnupgHome) },
	);
	const fpr = stdout
		.split("\n")
		.find((line) => line.startsWith("fpr:"))
		?.split(":")[9];
	if (!fpr) {
		throw new Error("Failed to create temporary GPG key");
	}

	await execFileAsync(
		"gpg",
		[
			"--batch",
			"--pinentry-mode",
			"loopback",
			"--passphrase",
			"",
			"--quick-add-key",
			fpr,
			"cv25519",
			"encrypt",
			"never",
		],
		{
			env: gpgEnv(gnupgHome),
			timeout: 30_000,
		},
	);

	const config: PassConfig = {
		storePath,
		extraPath: "/opt/homebrew/bin:/usr/local/bin",
		timeoutMs: 60_000,
	};

	await execFileAsync("pass", ["init", fpr], {
		env: gpgEnv(gnupgHome, storePath),
		timeout: 30_000,
	});

	// pass init creates a git repo; global commit.gpgsign would hang tests on pinentry.
	await fs.rm(path.join(storePath, ".git"), { recursive: true, force: true });

	return {
		config,
		storePath,
		gnupgHome,
		cleanup: async () => {
			try {
				await execFileAsync("gpgconf", ["--kill", "all"], {
					env: gpgEnv(gnupgHome),
					timeout: 5_000,
				});
			} catch {
				// best effort
			}
			await fs.rm(root, { recursive: true, force: true });
		},
	};
}

export async function runWithGnupgHome<T>(gnupgHome: string, fn: () => Promise<T>): Promise<T> {
	const previous = process.env.GNUPGHOME;
	process.env.GNUPGHOME = gnupgHome;
	try {
		return await fn();
	} finally {
		if (previous === undefined) {
			delete process.env.GNUPGHOME;
		} else {
			process.env.GNUPGHOME = previous;
		}
	}
}
