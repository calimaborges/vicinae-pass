import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import { delimiter, join } from "node:path";
import type { PassConfig } from "./types";
import { PassError, PassNotInstalledError, PassTimeoutError } from "./types";

export type RunPassOptions = {
	input?: string;
	timeoutMs?: number;
	env?: NodeJS.ProcessEnv;
};

export type RunPassResult = {
	stdout: string;
	stderr: string;
};

export function buildPassEnv(config: PassConfig): NodeJS.ProcessEnv {
	const env: NodeJS.ProcessEnv = { ...process.env };
	const extras = config.extraPath
		.split(delimiter)
		.map((part) => part.trim())
		.filter(Boolean);
	if (extras.length > 0) {
		env.PATH = [...extras, env.PATH].filter(Boolean).join(delimiter);
	}
	env.PASSWORD_STORE_DIR = config.storePath;
	env.GPG_TTY = env.GPG_TTY ?? "";
	return env;
}

async function withSecureTmpdir<T>(fn: (secureTmpdir: string) => Promise<T>): Promise<T> {
	const secureTmpdir = await fs.mkdtemp(join(os.tmpdir(), "vicinae-pass-"));
	await fs.chmod(secureTmpdir, 0o700);
	try {
		return await fn(secureTmpdir);
	} finally {
		await fs.rm(secureTmpdir, { recursive: true, force: true });
	}
}

export async function runPass(
	config: PassConfig,
	args: string[],
	options: RunPassOptions = {},
): Promise<RunPassResult> {
	const binary = config.passBinary?.trim() || "pass";
	const timeoutMs = options.timeoutMs ?? config.timeoutMs ?? 60_000;

	return withSecureTmpdir(async (secureTmpdir) => {
		const env = {
			...buildPassEnv(config),
			SECURE_TMPDIR: secureTmpdir,
			...options.env,
		};

		return await new Promise<RunPassResult>((resolve, reject) => {
			const child = spawn(binary, args, {
				env,
				stdio: ["pipe", "pipe", "pipe"],
			});

			let stdout = "";
			let stderr = "";
			let settled = false;

			const timer = setTimeout(() => {
				child.kill("SIGTERM");
				settled = true;
				reject(new PassTimeoutError());
			}, timeoutMs);

			child.stdout.setEncoding("utf-8");
			child.stderr.setEncoding("utf-8");
			child.stdout.on("data", (chunk: string) => {
				stdout += chunk;
			});
			child.stderr.on("data", (chunk: string) => {
				stderr += chunk;
			});

			child.on("error", (error: NodeJS.ErrnoException) => {
				if (settled) {
					return;
				}
				settled = true;
				clearTimeout(timer);
				if (error.code === "ENOENT") {
					reject(new PassNotInstalledError());
					return;
				}
				reject(new PassError(`pass ${args[0] ?? ""} failed: ${error.message}`, error));
			});

			child.on("close", (code, signal) => {
				if (settled) {
					return;
				}
				settled = true;
				clearTimeout(timer);

				if (signal === "SIGTERM") {
					reject(new PassTimeoutError());
					return;
				}

				if (code === 0) {
					resolve({ stdout, stderr });
					return;
				}

				const detail = stderr.trim() || stdout.trim() || `exit code ${code ?? "unknown"}`;
				reject(new PassError(`pass ${args[0] ?? ""} failed: ${detail}`));
			});

			if (options.input !== undefined) {
				child.stdin.end(options.input, "utf-8");
			} else {
				child.stdin.end();
			}
		});
	});
}
