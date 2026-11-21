import { Clipboard, closeMainWindow, PopToRootType, showHUD } from "@vicinae/api";

const reopenOnSameEntry = { popToRootType: PopToRootType.Suspended };

export async function copyConcealed(label: string, value: string): Promise<void> {
	await Clipboard.copy(value, { concealed: true });
	await showHUD(`Copied ${label}`, reopenOnSameEntry);
}

export async function pasteValue(value: string): Promise<void> {
	await Clipboard.paste(value);
	await closeMainWindow(reopenOnSameEntry);
}
