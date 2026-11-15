import { PassError, PassNotInstalledError, PassStoreMissingError, PassTimeoutError } from "../pass";

export function errorMessage(error: unknown, fallback = "Unexpected error"): string {
	if (error instanceof PassError) {
		return error.message;
	}
	if (error instanceof Error) {
		return error.message;
	}
	return fallback;
}

export function isRecoverableSetupError(error: unknown): boolean {
	return (
		error instanceof PassNotInstalledError ||
		error instanceof PassStoreMissingError ||
		error instanceof PassTimeoutError
	);
}
