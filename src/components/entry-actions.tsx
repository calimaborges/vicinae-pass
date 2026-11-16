import { Action, ActionPanel, Alert, confirmAlert, Icon, showToast, Toast } from "@vicinae/api";
import {
	generateTotpFromUri,
	nonUsernameFields,
	type ParsedEntry,
	removeEntry,
	type StoreEntry,
	showEntry,
} from "../pass";
import { getPassConfig } from "../preferences";
import { copyConcealed, pasteValue } from "../utils/clipboard";
import { errorMessage } from "../utils/errors";
import { EntryDetailView } from "../views/entry-detail";
import { EntryForm } from "../views/entry-form";
import { SetOtpForm } from "../views/otp-form";
import { RenameForm } from "../views/rename-form";

type EntryActionsProps = {
	entry: StoreEntry;
	parsed: ParsedEntry | null;
	onChanged: () => void;
};

async function withEntry(
	path: string,
	action: (entry: ParsedEntry) => Promise<void>,
): Promise<void> {
	try {
		const entry = await showEntry(getPassConfig(), path);
		await action(entry);
	} catch (error) {
		await showToast({
			style: Toast.Style.Failure,
			title: "Action failed",
			message: errorMessage(error),
		});
	}
}

async function copyOtp(otpauthUri: string): Promise<void> {
	try {
		const code = generateTotpFromUri(otpauthUri);
		await copyConcealed("OTP code", code.code);
	} catch (error) {
		await showToast({
			style: Toast.Style.Failure,
			title: "Failed to generate OTP",
			message: errorMessage(error),
		});
	}
}

async function pasteOtp(otpauthUri: string): Promise<void> {
	try {
		const code = generateTotpFromUri(otpauthUri);
		await pasteValue(code.code);
	} catch (error) {
		await showToast({
			style: Toast.Style.Failure,
			title: "Failed to generate OTP",
			message: errorMessage(error),
		});
	}
}

export function EntryActions({ entry, parsed, onChanged }: EntryActionsProps) {
	const customFields = parsed ? nonUsernameFields(parsed.fields) : [];

	return (
		<ActionPanel>
			<ActionPanel.Section title="Clipboard">
				<Action
					title="Copy Password"
					icon={Icon.Key}
					onAction={() => {
						if (parsed) {
							void copyConcealed("password", parsed.password);
							return;
						}
						void withEntry(entry.path, async (loaded) => {
							await copyConcealed("password", loaded.password);
						});
					}}
				/>
				<Action
					title="Paste Password"
					icon={Icon.Text}
					onAction={() => {
						if (parsed) {
							void pasteValue(parsed.password);
							return;
						}
						void withEntry(entry.path, async (loaded) => {
							await pasteValue(loaded.password);
						});
					}}
				/>
				{parsed?.username ? (
					<>
						<Action
							title="Copy Username"
							icon={Icon.Person}
							onAction={() => {
								const username = parsed.username;
								if (!username) {
									return;
								}
								void copyConcealed("username", username);
							}}
						/>
						<Action
							title="Paste Username"
							icon={Icon.Person}
							onAction={() => {
								const username = parsed.username;
								if (!username) {
									return;
								}
								void pasteValue(username);
							}}
						/>
					</>
				) : null}
				{parsed?.otpauthUri ? (
					<>
						<Action
							title="Copy OTP Code"
							icon={Icon.Clock}
							shortcut={{ modifiers: ["cmd"], key: "o" }}
							onAction={() => {
								const otpauthUri = parsed.otpauthUri;
								if (!otpauthUri) {
									return;
								}
								void copyOtp(otpauthUri);
							}}
						/>
						<Action
							title="Paste OTP Code"
							icon={Icon.Clock}
							onAction={() => {
								const otpauthUri = parsed.otpauthUri;
								if (!otpauthUri) {
									return;
								}
								void pasteOtp(otpauthUri);
							}}
						/>
					</>
				) : null}
				{customFields.flatMap((field) => [
					<Action
						key={`copy-${field.key}`}
						title={`Copy ${field.key}`}
						icon={Icon.CopyClipboard}
						onAction={() => {
							void copyConcealed(field.key, field.value);
						}}
					/>,
					<Action
						key={`paste-${field.key}`}
						title={`Paste ${field.key}`}
						icon={Icon.Text}
						onAction={() => {
							void pasteValue(field.value);
						}}
					/>,
				])}
			</ActionPanel.Section>

			<ActionPanel.Section title="Entry">
				<Action.Push
					title="Show Details"
					icon={Icon.Eye}
					target={<EntryDetailView path={entry.path} />}
				/>
				<Action.Push
					title="Edit Entry"
					icon={Icon.Pencil}
					shortcut={{ modifiers: ["cmd"], key: "e" }}
					target={<EntryForm entryPath={entry.path} onSaved={onChanged} />}
				/>
				<Action.Push
					title="Rename Entry"
					icon={Icon.Pencil}
					shortcut={{ modifiers: ["cmd"], key: "r" }}
					target={<RenameForm fromPath={entry.path} onSaved={() => onChanged()} />}
				/>
				<Action.Push
					title="Set OTP Secret"
					icon={Icon.Lock}
					target={<SetOtpForm path={entry.path} onSaved={onChanged} />}
				/>
				<Action
					title="Delete Entry"
					icon={Icon.Trash}
					style={Action.Style.Destructive}
					shortcut={{ modifiers: ["cmd"], key: "delete" }}
					onAction={async () => {
						const confirmed = await confirmAlert({
							title: "Delete entry?",
							message: `This will permanently delete "${entry.path}".`,
							primaryAction: {
								title: "Delete",
								style: Alert.ActionStyle.Destructive,
							},
						});
						if (!confirmed) {
							return;
						}
						try {
							await removeEntry(getPassConfig(), entry.path);
							await showToast({
								style: Toast.Style.Success,
								title: "Entry deleted",
								message: entry.path,
							});
							onChanged();
						} catch (error) {
							await showToast({
								style: Toast.Style.Failure,
								title: "Failed to delete entry",
								message: errorMessage(error),
							});
						}
					}}
				/>
			</ActionPanel.Section>
		</ActionPanel>
	);
}
