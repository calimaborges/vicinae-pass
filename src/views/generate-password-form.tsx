import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@vicinae/api";
import { useState } from "react";
import { defaultPasswordLength, generatePassword } from "../pass";
import { errorMessage } from "../utils/errors";
import { formBoolean, formString } from "../utils/form";

type GeneratePasswordFormProps = {
	onGenerated: (password: string) => void;
};

export function GeneratePasswordForm({ onGenerated }: GeneratePasswordFormProps) {
	const { pop } = useNavigation();
	const [isLoading, setIsLoading] = useState(false);

	async function handleSubmit(values: Form.Values) {
		setIsLoading(true);
		try {
			const length = Number.parseInt(formString(values, "length"), 10);
			const password = generatePassword({
				length,
				lowercase: formBoolean(values, "lowercase", true),
				uppercase: formBoolean(values, "uppercase", true),
				numbers: formBoolean(values, "numbers", true),
				symbols: formBoolean(values, "symbols", true),
				excludeAmbiguous: formBoolean(values, "excludeAmbiguous", true),
			});
			onGenerated(password);
			await showToast({
				style: Toast.Style.Success,
				title: "Password generated",
			});
			pop();
		} catch (error) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Failed to generate password",
				message: errorMessage(error),
			});
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<Form
			navigationTitle="Generate Password"
			isLoading={isLoading}
			actions={
				<ActionPanel>
					<Action.SubmitForm title="Use Password" icon={Icon.Key} onSubmit={handleSubmit} />
				</ActionPanel>
			}
		>
			<Form.TextField
				id="length"
				title="Length"
				defaultValue={String(defaultPasswordLength())}
				info="Defaults to PASSWORD_STORE_GENERATED_LENGTH or 25"
			/>
			<Form.Checkbox
				id="lowercase"
				title="Lowercase"
				label="Include lowercase letters"
				defaultValue={true}
			/>
			<Form.Checkbox
				id="uppercase"
				title="Uppercase"
				label="Include uppercase letters"
				defaultValue={true}
			/>
			<Form.Checkbox id="numbers" title="Numbers" label="Include numbers" defaultValue={true} />
			<Form.Checkbox id="symbols" title="Symbols" label="Include symbols" defaultValue={true} />
			<Form.Checkbox
				id="excludeAmbiguous"
				title="Ambiguous"
				label="Exclude ambiguous characters (0 O o 1 l I |)"
				defaultValue={true}
			/>
		</Form>
	);
}
