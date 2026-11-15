export type PassConfig = {
	storePath: string;
	extraPath: string;
	passBinary?: string;
	timeoutMs?: number;
};

export type StoreEntry = {
	path: string;
	name: string;
	folder: string | null;
	mtimeMs: number;
};

export type EntryField = {
	key: string;
	value: string;
};

export type ParsedEntry = {
	password: string;
	username: string | null;
	otpauthUri: string | null;
	fields: EntryField[];
	notes: string[];
	raw: string;
};

export type GenerateOptions = {
	length?: number;
	noSymbols?: boolean;
	inPlace?: boolean;
	force?: boolean;
};

export class PassError extends Error {
	constructor(
		message: string,
		readonly cause?: unknown,
	) {
		super(message);
		this.name = "PassError";
	}
}

export class PassNotInstalledError extends PassError {
	constructor() {
		super(
			"pass is not installed or not on PATH. Install it, or add its directory to Additional PATH Entries.",
		);
		this.name = "PassNotInstalledError";
	}
}

export class PassStoreMissingError extends PassError {
	constructor(storePath: string) {
		super(`Password store not found at "${storePath}".`);
		this.name = "PassStoreMissingError";
	}
}

export class PassEntryExistsError extends PassError {
	constructor(path: string) {
		super(`An entry already exists at "${path}".`);
		this.name = "PassEntryExistsError";
	}
}

export class PassEntryMissingError extends PassError {
	constructor(path: string) {
		super(`No entry found at "${path}".`);
		this.name = "PassEntryMissingError";
	}
}

export class PassTimeoutError extends PassError {
	constructor() {
		super("pass timed out waiting for GPG. Unlock your key with pinentry, then try again.");
		this.name = "PassTimeoutError";
	}
}

export class PassInvalidPathError extends PassError {
	constructor(path: string) {
		super(`Invalid entry path "${path}".`);
		this.name = "PassInvalidPathError";
	}
}

export class OtpError extends PassError {
	constructor(message: string) {
		super(message);
		this.name = "OtpError";
	}
}
