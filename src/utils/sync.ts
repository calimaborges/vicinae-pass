import { showToast, Toast } from "@vicinae/api";
import { PassGitMissingError, summarizeSyncOutput, syncStore } from "../pass";
import { getPassConfig } from "../preferences";
import { errorMessage } from "./errors";

export async function runStoreSync(): Promise<void> {
	const toast = await showToast({
		style: Toast.Style.Animated,
		title: "Syncing password store…",
		message: "pull then push",
	});

	try {
		const result = await syncStore(getPassConfig());
		toast.message = summarizeSyncOutput(result) || "pull and push completed";
		toast.style = Toast.Style.Success;
		toast.title = "Password store synced";
	} catch (error) {
		toast.message = errorMessage(error);
		toast.style = Toast.Style.Failure;
		toast.title = error instanceof PassGitMissingError ? "Git not configured" : "Sync failed";
	}
}
