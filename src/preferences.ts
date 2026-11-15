import { getPreferenceValues } from "@vicinae/api";
import type { PassConfig } from "./pass";
import { resolveStorePath } from "./pass";

type ExtensionPreferences = {
	storePath?: string;
	extraPath?: string;
};

export function getPassConfig(): PassConfig {
	const preferences = getPreferenceValues<ExtensionPreferences>();
	return {
		storePath: resolveStorePath(preferences.storePath || "~/.password-store"),
		extraPath: preferences.extraPath?.trim() || "/opt/homebrew/bin:/usr/local/bin",
	};
}
