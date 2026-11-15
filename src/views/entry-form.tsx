import {
	Action,
	ActionPanel,
	Alert,
	confirmAlert,
	Form,
	Icon,
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
import { copyConcealed } from "../utils/clipboard";
import { errorMessage } from "../utils/errors";
import { GeneratePasswordForm } from "./generate-password-form";

type EntryFormProps = {
	entryPath?: string;
	onSaved?: (path: string) => void;
};

type FormState = {
	loading: boolean;
	path: string;
	password: string;
	extra: string;
	showPassword: boolean;
	error?: string;
};

function initialState(entryPath?: string): FormState {
	return {
		loading: Boolean(entryPath),
		path: entryPath ?? "",
		password: "",
		extra: "",
		showPassword: false,
	};
}

function extraFromEntry(entry: Awaited<ReturnType<typeof showEntry>>): string {
	const extraLines: string[] = [];
	for (const field of entry.fields) {
		extraLines.push(`${field.key}: ${field.value}`);
	}
	if (entry.otpauthUri) {
		extraLines.push(entry.otpauthUri);
	}
	extraLines.push(...entry.notes);
	return extraLines.join("\n");
}

export function EntryForm({ entryPath, onSaved }: EntryFormProps) {
	const { pop } = useNavigation();
	const isEdit = Boolean(entryPath);
	const [isSaving, setIsSaving] = useState(false);
	const [state, setState] = useState<FormState>(() => initialState(entryPath));

	useEffect(() => {
		if (!entryPath) {
			return;
		}

		let cancelled = false;
		void (async () => {
			try {
				const entry = await showEntry(getPassConfig(), entryPath);
				if (!cancelled) {
					setState((current) => ({
						...current,
						loading: false,
						path: entryPath,
						password: entry.password,
						extra: extraFromEntry(entry),
						error: undefined,
					}));
				}
			} catch (error) {
				if (!cancelled) {
					setState((current) => ({
						...current,
						loading: false,
						password: "",
						extra: "",
						error: errorMessage(error),
					}));
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [entryPath]);

	function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
		setState((current) => ({ ...current, [key]: value }));
	}

	async function saveEntry(copyAfter: boolean) {
		setIsSaving(true);
		const config = getPassConfig();
		const pathValue = isEdit ? (entryPath ?? "") : state.path.trim();
		const password = state.password;
		const extra = state.extra;

		try {
			if (!pathValue) {
				throw new Error("Path is required.");
			}

			const extras = parseExtraLines(extra);
			const content = serializeEntry({
				password,
				fields: extras.fields,
				otpauthUri: extras.otpauthUri,
				notes: extras.notes,
			});

			try {
				await insertEntry(config, pathValue, content, {
					force: isEdit,
				});
			} catch (error) {
				if (error instanceof PassEntryExistsError) {
					const confirmed = await confirmAlert({
						title: "Overwrite existing entry?",
						message: `"${pathValue}" already exists.`,
						primaryAction: {
							title: "Overwrite",
							style: Alert.ActionStyle.Destructive,
						},
					});
					if (!confirmed) {
						return;
					}
					await insertEntry(config, pathValue, content, { force: true });
				} else {
					throw error;
				}
			}

			await showToast({
				style: Toast.Style.Success,
				title: isEdit ? "Entry updated" : "Entry created",
				message: pathValue,
			});

			if (copyAfter) {
				await copyConcealed("password", password);
			}

			onSaved?.(pathValue);
			if (isEdit) {
				pop();
			}
		} catch (error) {
			await showToast({
				style: Toast.Style.Failure,
				title: isEdit ? "Failed to update entry" : "Failed to create entry",
				message: errorMessage(error),
			});
		} finally {
			setIsSaving(false);
		}
	}

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

	const PasswordInput = state.showPassword ? Form.TextField : Form.PasswordField;

	return (
		<Form
			isLoading={isSaving}
			actions={
				<ActionPanel>
					<Action.SubmitForm
						title={isEdit ? "Save Entry" : "Create Entry"}
						icon={Icon.Check}
						onSubmit={() => void saveEntry(false)}
					/>
					<Action.Push
						title="Generate Password"
						icon={Icon.Key}
						shortcut={{ modifiers: ["cmd"], key: "g" }}
						target={
							<GeneratePasswordForm onGenerated={(password) => updateField("password", password)} />
						}
					/>
					<Action.SubmitForm
						title={isEdit ? "Save and Copy Password" : "Create and Copy Password"}
						icon={Icon.CopyClipboard}
						onSubmit={() => void saveEntry(true)}
					/>
				</ActionPanel>
			}
		>
			{isEdit ? (
				<Form.Description title="Path" text={state.path} />
			) : (
				<Form.TextField
					id="path"
					title="Path"
					placeholder="personal/example.com"
					value={state.path}
					onChange={(value) => updateField("path", value)}
					info="Folder/name inside the password store"
				/>
			)}
			<PasswordInput
				id="password"
				title="Password"
				value={state.password}
				onChange={(value) => updateField("password", value)}
			/>
			<Form.Checkbox
				id="showPassword"
				title="Visibility"
				label="Show password"
				value={state.showPassword}
				onChange={(value) => updateField("showPassword", value)}
			/>
			<Form.TextArea
				id="extra"
				title="Extra Lines"
				placeholder={"username: alice\nurl: https://example.com"}
				value={state.extra}
				onChange={(value) => updateField("extra", value)}
				info="Optional key: value lines, otpauth URI, or free-form notes"
			/>
		</Form>
	);
}
