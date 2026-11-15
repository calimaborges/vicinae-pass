import fs from "node:fs/promises";
import { type RunPassResult, runPass } from "./cli";
import type { PassConfig } from "./types";
import { PassError, PassGitMissingError, PassStoreMissingError } from "./types";

const SYNC_TIMEOUT_MS = 120_000;

export type SyncResult = {
	pull: RunPassResult;
	push: RunPassResult;
};

async function ensureStoreExists(config: PassConfig): Promise<void> {
	try {
		const stats = await fs.stat(config.storePath);
		if (!stats.isDirectory()) {
			throw new PassStoreMissingError(config.storePath);
		}
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			throw new PassStoreMissingError(config.storePath);
		}
		throw error;
	}
}

function isNotGitRepositoryError(error: unknown): boolean {
	if (!(error instanceof PassError)) {
		return false;
	}
	return /not a git repository/i.test(error.message);
}

export async function ensureGitStore(config: PassConfig): Promise<void> {
	await ensureStoreExists(config);
	try {
		const { stdout } = await runPass(config, ["git", "rev-parse", "--is-inside-work-tree"], {
			timeoutMs: 15_000,
			env: { GIT_TERMINAL_PROMPT: "0" },
		});
		if (stdout.trim() !== "true") {
			throw new PassGitMissingError(config.storePath);
		}
	} catch (error) {
		if (error instanceof PassGitMissingError) {
			throw error;
		}
		if (isNotGitRepositoryError(error)) {
			throw new PassGitMissingError(config.storePath);
		}
		throw error;
	}
}

export function summarizeSyncOutput(result: SyncResult): string {
	const pull = result.pull.stdout.trim() || result.pull.stderr.trim();
	const push = result.push.stdout.trim() || result.push.stderr.trim();
	const parts = [pull && `pull: ${pull}`, push && `push: ${push}`].filter(Boolean);
	const summary = parts.join(" · ");
	if (summary.length <= 180) {
		return summary;
	}
	return `${summary.slice(0, 177)}...`;
}

export async function syncStore(config: PassConfig): Promise<SyncResult> {
	await ensureGitStore(config);

	const gitEnv = { GIT_TERMINAL_PROMPT: "0" };
	const pull = await runPass(config, ["git", "pull"], {
		timeoutMs: SYNC_TIMEOUT_MS,
		env: gitEnv,
	});
	const push = await runPass(config, ["git", "push"], {
		timeoutMs: SYNC_TIMEOUT_MS,
		env: gitEnv,
	});

	return { pull, push };
}
