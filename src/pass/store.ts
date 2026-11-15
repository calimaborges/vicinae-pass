import fs from "node:fs/promises";
import path from "node:path";
import { entryFilePath, splitEntryPath } from "./path";
import type { PassConfig, StoreEntry } from "./types";
import { PassStoreMissingError } from "./types";

async function safeStat(target: string) {
	try {
		return await fs.stat(target);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return null;
		}
		throw error;
	}
}

function shouldSkipDirectory(name: string): boolean {
	return name.startsWith(".");
}

async function walkStore(root: string, relative = ""): Promise<StoreEntry[]> {
	const entries: StoreEntry[] = [];
	const dir = relative ? path.join(root, relative) : root;
	const dirents = await fs.readdir(dir, { withFileTypes: true });

	for (const dirent of dirents) {
		if (dirent.isDirectory()) {
			if (shouldSkipDirectory(dirent.name)) {
				continue;
			}
			const childRelative = relative ? path.join(relative, dirent.name) : dirent.name;
			entries.push(...(await walkStore(root, childRelative)));
			continue;
		}

		if (!dirent.name.endsWith(".gpg")) {
			continue;
		}

		const fullPath = path.join(dir, dirent.name);
		let isFile = dirent.isFile();
		if (dirent.isSymbolicLink()) {
			const linkStats = await safeStat(fullPath);
			isFile = Boolean(linkStats?.isFile());
		}
		if (!isFile) {
			continue;
		}

		const fileRelative = relative ? path.join(relative, dirent.name) : dirent.name;
		const entryPath = fileRelative.slice(0, -4).split(path.sep).join("/");
		const stats = await fs.stat(fullPath);
		const { name, folder } = splitEntryPath(entryPath);
		entries.push({
			path: entryPath,
			name,
			folder,
			mtimeMs: stats.mtimeMs,
		});
	}

	return entries;
}

export async function listEntries(config: PassConfig): Promise<StoreEntry[]> {
	const stats = await safeStat(config.storePath);
	if (!stats?.isDirectory()) {
		throw new PassStoreMissingError(config.storePath);
	}
	const entries = await walkStore(config.storePath);
	return entries.sort((a, b) => a.path.localeCompare(b.path));
}

export async function entryExists(config: PassConfig, entryPath: string): Promise<boolean> {
	const stats = await safeStat(entryFilePath(config.storePath, entryPath));
	return Boolean(stats?.isFile());
}
