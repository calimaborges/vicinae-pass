import { runPass } from "./cli";
import { parseEntry } from "./entry";
import { entryFilePath, validateEntryPath } from "./path";
import { entryExists } from "./store";
import type { GenerateOptions, ParsedEntry, PassConfig } from "./types";
import { PassEntryExistsError, PassEntryMissingError, PassError } from "./types";

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

export async function generateEntry(
	config: PassConfig,
	entryPath: string,
	options: GenerateOptions = {},
): Promise<string> {
	const path = validateEntryPath(entryPath);
	const exists = await entryExists(config, path);

	if (options.inPlace) {
		if (!exists) {
			throw new PassEntryMissingError(path);
		}
	} else if (exists && !options.force) {
		throw new PassEntryExistsError(path);
	}

	const args = ["generate"];
	if (options.noSymbols) {
		args.push("--no-symbols");
	}
	if (options.inPlace) {
		args.push("--in-place");
	} else {
		args.push("--force");
	}
	args.push("--", path);

	const length = options.length;
	if (length !== undefined) {
		if (!Number.isInteger(length) || length < 1) {
			throw new PassError(`Invalid password length: ${length}`);
		}
		args.push(String(length));
	}

	const { stdout } = await runPass(config, args);
	const ansiEscape = `${String.fromCharCode(27)}\\[[0-9;]*m`;
	const generated =
		stdout
			.replace(new RegExp(ansiEscape, "g"), "")
			.trim()
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean)
			.at(-1) ?? "";
	if (generated) {
		return generated;
	}

	const shown = await showEntry(config, path);
	return shown.password;
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

export async function defaultGeneratedLength(config: PassConfig): Promise<number> {
	const fromEnv = Number.parseInt(process.env.PASSWORD_STORE_GENERATED_LENGTH || "", 10);
	if (Number.isInteger(fromEnv) && fromEnv > 0) {
		return fromEnv;
	}
	void config;
	return 25;
}

export { entryFilePath };
