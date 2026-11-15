import { runPass } from "./cli";
import { parseEntry } from "./entry";
import { entryFilePath, validateEntryPath } from "./path";
import { entryExists } from "./store";
import type { ParsedEntry, PassConfig } from "./types";
import { PassEntryExistsError, PassEntryMissingError } from "./types";

export async function showEntry(config: PassConfig, entryPath: string): Promise<ParsedEntry> {
	const path = validateEntryPath(entryPath);
	if (!(await entryExists(config, path))) {
		throw new PassEntryMissingError(path);
	}
	const { stdout } = await runPass(config, ["show", "--", path]);
	return parseEntry(stdout);
}

export async function insertEntry(
	config: PassConfig,
	entryPath: string,
	content: string,
	options: { force?: boolean } = {},
): Promise<void> {
	const path = validateEntryPath(entryPath);
	const exists = await entryExists(config, path);
	if (exists && !options.force) {
		throw new PassEntryExistsError(path);
	}

	const normalized = content.endsWith("\n") ? content : `${content}\n`;
	await runPass(config, ["insert", "--multiline", "--force", "--", path], {
		input: normalized,
	});
}

export async function moveEntry(
	config: PassConfig,
	fromPath: string,
	toPath: string,
	options: { force?: boolean } = {},
): Promise<void> {
	const from = validateEntryPath(fromPath);
	const to = validateEntryPath(toPath);
	if (!(await entryExists(config, from))) {
		throw new PassEntryMissingError(from);
	}
	if (from === to) {
		return;
	}
	const destinationExists = await entryExists(config, to);
	if (destinationExists && !options.force) {
		throw new PassEntryExistsError(to);
	}
	await runPass(config, ["mv", "--force", "--", from, to]);
}

export async function removeEntry(config: PassConfig, entryPath: string): Promise<void> {
	const path = validateEntryPath(entryPath);
	if (!(await entryExists(config, path))) {
		throw new PassEntryMissingError(path);
	}
	await runPass(config, ["rm", "--force", "--", path]);
}

export { entryFilePath };
