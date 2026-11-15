import { Clipboard, closeMainWindow, showToast, Toast } from "@vicinae/api";

export async function copyConcealed(label: string, value: string): Promise<void> {
	await Clipboard.copy(value, { concealed: true });
	await showToast({
		style: Toast.Style.Success,
		title: `Copied ${label}`,
	});
}

export async function pasteValue(value: string): Promise<void> {
	await Clipboard.paste(value);
	await closeMainWindow();
}
