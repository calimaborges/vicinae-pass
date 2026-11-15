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
import { useEffect, useState } from "react";
import {
	insertEntry,
	PassEntryExistsError,
	parseExtraLines,
	serializeEntry,
	showEntry,
} from "../pass";
import { getPassConfig } from "../preferences";
import { errorMessage } from "../utils/errors";
import { formString } from "../utils/form";

type EntryFormProps = {
	initialPath?: string;
	initialPassword?: string;
	initialExtra?: string;
	pathEditable?: boolean;
	mode: "create" | "edit";
	onSaved?: (path: string) => void;
};

export function EntryForm({
	initialPath = "",
	initialPassword = "",
	initialExtra = "",
	pathEditable = true,
	mode,
	onSaved,
}: EntryFormProps) {
	const { pop } = useNavigation();
	const [isLoading, setIsLoading] = useState(false);

	async function handleSubmit(values: Form.Values) {
		setIsLoading(true);
		const config = getPassConfig();
		const pathValue = formString(values, "path");
		const password = formString(values, "password");
		const extra = formString(values, "extra");
		const entryPath = pathEditable ? pathValue : initialPath;
		try {
			const extras = parseExtraLines(extra);
			const content = serializeEntry({
				password,
				fields: extras.fields,
				otpauthUri: extras.otpauthUri,
				notes: extras.notes,
			});

			try {
				await insertEntry(config, entryPath, content, {
					force: mode === "edit",
				});
			} catch (error) {
				if (error instanceof PassEntryExistsError) {
					const confirmed = await confirmAlert({
						title: "Overwrite existing entry?",
						message: `"${entryPath}" already exists.`,
						primaryAction: {
							title: "Overwrite",
							style: Alert.ActionStyle.Destructive,
						},
					});
					if (!confirmed) {
						return;
					}
					await insertEntry(config, entryPath, content, { force: true });
				} else {
					throw error;
				}
			}

			await showToast({
				style: Toast.Style.Success,
				title: mode === "edit" ? "Entry updated" : "Entry created",
				message: entryPath,
			});
			onSaved?.(entryPath.trim());
			if (mode === "edit") {
				pop();
			}
		} catch (error) {
			await showToast({
				style: Toast.Style.Failure,
				title: mode === "edit" ? "Failed to update entry" : "Failed to create entry",
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
					<Action.SubmitForm
						title={mode === "edit" ? "Save Entry" : "Create Entry"}
						onSubmit={handleSubmit}
					/>
				</ActionPanel>
			}
		>
			{pathEditable ? (
				<Form.TextField
					id="path"
					title="Path"
					placeholder="personal/example.com"
					defaultValue={initialPath}
					info="Folder/name inside the password store"
				/>
			) : (
				<Form.Description title="Path" text={initialPath} />
			)}
			<Form.PasswordField id="password" title="Password" defaultValue={initialPassword} />
			<Form.TextArea
				id="extra"
				title="Extra Lines"
				placeholder={"username: alice\nurl: https://example.com"}
				defaultValue={initialExtra}
				info="Optional key: value lines, otpauth URI, or free-form notes"
			/>
		</Form>
	);
}

export async function loadEntryForEdit(path: string): Promise<{
	password: string;
	extra: string;
}> {
	const config = getPassConfig();
	const entry = await showEntry(config, path);
	const extraLines: string[] = [];
	for (const field of entry.fields) {
		extraLines.push(`${field.key}: ${field.value}`);
	}
	if (entry.otpauthUri) {
		extraLines.push(entry.otpauthUri);
	}
	extraLines.push(...entry.notes);
	return {
		password: entry.password,
		extra: extraLines.join("\n"),
	};
}

export function EditEntryForm({ path, onSaved }: { path: string; onSaved?: () => void }) {
	const [state, setState] = useState<{
		loading: boolean;
		password: string;
		extra: string;
		error?: string;
	}>({ loading: true, password: "", extra: "" });

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			try {
				const loaded = await loadEntryForEdit(path);
				if (!cancelled) {
					setState({ loading: false, ...loaded });
				}
			} catch (error) {
				if (!cancelled) {
					setState({
						loading: false,
						password: "",
						extra: "",
						error: errorMessage(error),
					});
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [path]);

	if (state.loading) {
		return <Form isLoading />;
	}

	if (state.error) {
		return (
			<Form>
				<Form.Description title="Error" text={state.error} />
			</Form>
		);
	}

	return (
		<EntryForm
			mode="edit"
			initialPath={path}
			initialPassword={state.password}
			initialExtra={state.extra}
			pathEditable={false}
			onSaved={onSaved}
		/>
	);
}
