import { runStoreSync } from "./utils/sync";

export default async function SyncCommand() {
	await runStoreSync();
}
