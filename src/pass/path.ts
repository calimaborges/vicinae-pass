import os from "node:os";
import path from "node:path";
import { PassInvalidPathError } from "./types";

export function expandHomePath(input: string): string {
	if (!input || input === "~") {
		return os.homedir();
	}
	if (input.startsWith("~/")) {
		return path.join(os.homedir(), input.slice(2));
	}
	return input;
}

export function resolveStorePath(input: string): string {
	return path.resolve(expandHomePath(input.trim() || "~/.password-store"));
}

export function validateEntryPath(entryPath: string): string {
	const normalized = entryPath.trim().replace(/\\/g, "/");
	if (!normalized) {
		throw new PassInvalidPathError(entryPath);
	}
	if (normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized)) {
		throw new PassInvalidPathError(entryPath);
	}
	const trimmed = normalized.replace(/^\/+|\/+$/g, "");
	if (!trimmed) {
		throw new PassInvalidPathError(entryPath);
	}
	const segments = trimmed.split("/");
	if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
		throw new PassInvalidPathError(entryPath);
	}
	if (trimmed.endsWith(".gpg")) {
		throw new PassInvalidPathError(entryPath);
	}
	return segments.join("/");
}

export function entryFilePath(storePath: string, entryPath: string): string {
	return path.join(storePath, `${validateEntryPath(entryPath)}.gpg`);
}

export function splitEntryPath(entryPath: string): { name: string; folder: string | null } {
	const normalized = validateEntryPath(entryPath);
	const slash = normalized.lastIndexOf("/");
	if (slash === -1) {
		return { name: normalized, folder: null };
	}
	return {
		name: normalized.slice(slash + 1),
		folder: normalized.slice(0, slash),
	};
}
