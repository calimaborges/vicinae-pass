import { Action, ActionPanel, Alert, confirmAlert, Icon, showToast, Toast } from "@vicinae/api";
import { generateTotpFromUri, removeEntry, type StoreEntry, showEntry } from "../pass";
import { getPassConfig } from "../preferences";
import { copyConcealed, pasteValue } from "../utils/clipboard";
import { errorMessage } from "../utils/errors";
import { EntryDetailView } from "../views/entry-detail";
import { EditEntryForm } from "../views/entry-form";
import { GenerateForm } from "../views/generate-form";
import { SetOtpForm } from "../views/otp-form";
import { RenameForm } from "../views/rename-form";

type EntryActionsProps = {
	entry: StoreEntry;
	onChanged: () => void;
};

async function withEntry(
	path: string,
	action: (entry: Awaited<ReturnType<typeof showEntry>>) => Promise<void>,
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

export function EntryActions({ entry, onChanged }: EntryActionsProps) {
	return (
		<ActionPanel>
			<ActionPanel.Section title="Clipboard">
				<Action
					title="Copy Password"
					icon={Icon.Key}
					onAction={() =>
						withEntry(entry.path, async (parsed) => {
							await copyConcealed("password", parsed.password);
						})
					}
				/>
				<Action
					title="Paste Password"
					icon={Icon.Text}
					onAction={() =>
						withEntry(entry.path, async (parsed) => {
							await pasteValue(parsed.password);
						})
					}
				/>
				<Action
					title="Copy Username"
					icon={Icon.Person}
					onAction={() =>
						withEntry(entry.path, async (parsed) => {
							if (!parsed.username) {
								await showToast({
									style: Toast.Style.Failure,
									title: "No username field",
									message: "This entry has no username, user, login, or email field.",
								});
								return;
							}
							await copyConcealed("username", parsed.username);
						})
					}
				/>
				<Action
					title="Copy OTP Code"
					icon={Icon.Clock}
					shortcut={{ modifiers: ["cmd"], key: "o" }}
					onAction={() =>
						withEntry(entry.path, async (parsed) => {
							if (!parsed.otpauthUri) {
								await showToast({
									style: Toast.Style.Failure,
									title: "No OTP secret",
									message: "Use Set OTP Secret to add one.",
								});
								return;
							}
							try {
								const code = generateTotpFromUri(parsed.otpauthUri);
								await copyConcealed("OTP code", code.code);
							} catch (error) {
								await showToast({
									style: Toast.Style.Failure,
									title: "Failed to generate OTP",
									message: errorMessage(error),
								});
							}
						})
					}
				/>
				<Action
					title="Paste OTP Code"
					icon={Icon.Clock}
					onAction={() =>
						withEntry(entry.path, async (parsed) => {
							if (!parsed.otpauthUri) {
								await showToast({
									style: Toast.Style.Failure,
									title: "No OTP secret",
									message: "Use Set OTP Secret to add one.",
								});
								return;
							}
							try {
								const code = generateTotpFromUri(parsed.otpauthUri);
								await pasteValue(code.code);
							} catch (error) {
								await showToast({
									style: Toast.Style.Failure,
									title: "Failed to generate OTP",
									message: errorMessage(error),
								});
							}
						})
					}
				/>
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
					target={<EditEntryForm path={entry.path} onSaved={onChanged} />}
				/>
				<Action.Push
					title="Regenerate Password"
					icon={Icon.ArrowClockwise}
					target={<GenerateForm initialPath={entry.path} inPlace onSaved={() => onChanged()} />}
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
