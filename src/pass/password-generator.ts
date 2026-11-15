import { randomInt } from "node:crypto";
import { PassError } from "./types";

const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBERS = "0123456789";
const SYMBOLS = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
const AMBIGUOUS = new Set(["0", "O", "o", "1", "l", "I", "|"]);

export type PasswordGeneratorOptions = {
	length: number;
	lowercase: boolean;
	uppercase: boolean;
	numbers: boolean;
	symbols: boolean;
	excludeAmbiguous: boolean;
};

function filterAmbiguous(charset: string, excludeAmbiguous: boolean): string {
	if (!excludeAmbiguous) {
		return charset;
	}
	return [...charset].filter((char) => !AMBIGUOUS.has(char)).join("");
}

function pickChar(charset: string): string {
	return charset[randomInt(charset.length)] ?? "";
}

function shuffle(chars: string[]): string[] {
	for (let index = chars.length - 1; index > 0; index -= 1) {
		const swapIndex = randomInt(index + 1);
		const current = chars[index];
		const swap = chars[swapIndex];
		if (current === undefined || swap === undefined) {
			continue;
		}
		chars[index] = swap;
		chars[swapIndex] = current;
	}
	return chars;
}

export function defaultPasswordLength(): number {
	const fromEnv = Number.parseInt(process.env.PASSWORD_STORE_GENERATED_LENGTH || "", 10);
	if (Number.isInteger(fromEnv) && fromEnv > 0) {
		return fromEnv;
	}
	return 25;
}

export function generatePassword(options: PasswordGeneratorOptions): string {
	const { length, lowercase, uppercase, numbers, symbols, excludeAmbiguous } = options;

	if (!Number.isInteger(length) || length < 1) {
		throw new PassError("Length must be a positive integer.");
	}

	const classes: string[] = [];
	if (lowercase) {
		classes.push(filterAmbiguous(LOWERCASE, excludeAmbiguous));
	}
	if (uppercase) {
		classes.push(filterAmbiguous(UPPERCASE, excludeAmbiguous));
	}
	if (numbers) {
		classes.push(filterAmbiguous(NUMBERS, excludeAmbiguous));
	}
	if (symbols) {
		classes.push(filterAmbiguous(SYMBOLS, excludeAmbiguous));
	}

	const nonemptyClasses = classes.filter((charset) => charset.length > 0);
	if (nonemptyClasses.length === 0) {
		throw new PassError("Select at least one character class.");
	}
	if (length < nonemptyClasses.length) {
		throw new PassError(
			`Length must be at least ${nonemptyClasses.length} to include every selected character class.`,
		);
	}

	const pool = nonemptyClasses.join("");
	const chars: string[] = nonemptyClasses.map((charset) => pickChar(charset));
	while (chars.length < length) {
		chars.push(pickChar(pool));
	}

	return shuffle(chars).join("");
}
