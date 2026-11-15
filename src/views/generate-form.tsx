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
import { defaultGeneratedLength, generateEntry, PassEntryExistsError } from "../pass";
import { getPassConfig } from "../preferences";
import { copyConcealed } from "../utils/clipboard";
import { errorMessage } from "../utils/errors";
import { formBoolean, formString } from "../utils/form";

type GenerateFormProps = {
	initialPath?: string;
	inPlace?: boolean;
	onSaved?: (path: string) => void;
};

export function GenerateForm({ initialPath = "", inPlace = false, onSaved }: GenerateFormProps) {
	const { pop } = useNavigation();
	const [isLoading, setIsLoading] = useState(false);
	const [defaultLength, setDefaultLength] = useState("25");

	useEffect(() => {
		void defaultGeneratedLength(getPassConfig()).then((length) => {
			setDefaultLength(String(length));
		});
	}, []);

	async function handleSubmit(values: Form.Values) {
		setIsLoading(true);
		const config = getPassConfig();
		const entryPath = inPlace ? initialPath : formString(values, "path");
		const length = Number.parseInt(formString(values, "length"), 10);
		const includeSymbols = formBoolean(values, "includeSymbols", true);
		const copyAfter = formBoolean(values, "copyAfter", true);

		try {
			if (!Number.isInteger(length) || length < 1) {
				throw new Error("Length must be a positive integer.");
			}

			const run = async (force: boolean) =>
				generateEntry(config, entryPath, {
					length,
					noSymbols: !includeSymbols,
					inPlace,
					force,
				});

			let password: string;
			try {
				password = await run(inPlace);
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
					password = await run(true);
				} else {
					throw error;
				}
			}

			await showToast({
				style: Toast.Style.Success,
				title: inPlace ? "Password regenerated" : "Password generated",
				message: entryPath,
			});

			if (copyAfter) {
				await copyConcealed("password", password);
			}

			onSaved?.(entryPath.trim());
			if (inPlace) {
				pop();
			}
		} catch (error) {
			await showToast({
				style: Toast.Style.Failure,
				title: inPlace ? "Failed to regenerate password" : "Failed to generate password",
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
						title={inPlace ? "Regenerate Password" : "Generate Password"}
						onSubmit={handleSubmit}
					/>
				</ActionPanel>
			}
		>
			{inPlace ? (
				<Form.Description title="Entry" text={initialPath} />
			) : (
				<Form.TextField
					id="path"
					title="Path"
					placeholder="personal/example.com"
					defaultValue={initialPath}
				/>
			)}
			<Form.TextField
				id="length"
				title="Length"
				defaultValue={defaultLength}
				info="Defaults to PASSWORD_STORE_GENERATED_LENGTH or 25"
			/>
			<Form.Checkbox
				id="includeSymbols"
				label="Include symbols"
				defaultValue={true}
				title="Symbols"
			/>
			<Form.Checkbox
				id="copyAfter"
				label="Copy password after generate"
				defaultValue={true}
				title="Clipboard"
			/>
		</Form>
	);
}
