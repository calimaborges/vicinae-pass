import {
	Action,
	ActionPanel,
	Alert,
	confirmAlert,
	Form,
	showToast,
	Toast,
	useNavigation,
} from "@vicinae/api";
import { useState } from "react";
import { moveEntry, PassEntryExistsError } from "../pass";
import { getPassConfig } from "../preferences";
import { errorMessage } from "../utils/errors";
import { formString } from "../utils/form";

export function RenameForm({
	fromPath,
	onSaved,
}: {
	fromPath: string;
	onSaved?: (path: string) => void;
}) {
	const { pop } = useNavigation();
	const [isLoading, setIsLoading] = useState(false);

	async function handleSubmit(values: Form.Values) {
		setIsLoading(true);
		const config = getPassConfig();
		const toPath = formString(values, "toPath");
		try {
			try {
				await moveEntry(config, fromPath, toPath);
			} catch (error) {
				if (error instanceof PassEntryExistsError) {
					const confirmed = await confirmAlert({
						title: "Overwrite destination?",
						message: `"${toPath}" already exists.`,
						primaryAction: {
							title: "Overwrite",
							style: Alert.ActionStyle.Destructive,
						},
					});
					if (!confirmed) {
						return;
					}
					await moveEntry(config, fromPath, toPath, { force: true });
				} else {
					throw error;
				}
			}

			await showToast({
				style: Toast.Style.Success,
				title: "Entry renamed",
				message: `${fromPath} → ${toPath}`,
			});
			onSaved?.(toPath.trim());
			pop();
		} catch (error) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Failed to rename entry",
				message: errorMessage(error),
			});
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<Form
			isLoading={isLoading}
			actions={
				<ActionPanel>
					<Action.SubmitForm title="Rename Entry" onSubmit={handleSubmit} />
				</ActionPanel>
			}
		>
			<Form.Description title="From" text={fromPath} />
			<Form.TextField id="toPath" title="New Path" defaultValue={fromPath} />
		</Form>
	);
}
