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
import { insertEntry, setOtpOnEntry, showEntry } from "../pass";
import { getPassConfig } from "../preferences";
import { errorMessage } from "../utils/errors";
import { formString } from "../utils/form";

export function SetOtpForm({ path, onSaved }: { path: string; onSaved?: () => void }) {
	const { pop } = useNavigation();
	const [isLoading, setIsLoading] = useState(false);

	async function handleSubmit(values: Form.Values) {
		setIsLoading(true);
		const config = getPassConfig();
		const secret = formString(values, "secret");
		const issuer = formString(values, "issuer");
		const account = formString(values, "account");
		try {
			const entry = await showEntry(config, path);
			if (entry.otpauthUri) {
				const confirmed = await confirmAlert({
					title: "Replace OTP secret?",
					message: `"${path}" already has an OTP secret.`,
					primaryAction: {
						title: "Replace",
						style: Alert.ActionStyle.Destructive,
					},
				});
				if (!confirmed) {
					return;
				}
			}

			const content = setOtpOnEntry(entry.raw, secret, {
				issuer: issuer || undefined,
				account: account || undefined,
			});
			await insertEntry(config, path, content, { force: true });

			await showToast({
				style: Toast.Style.Success,
				title: "OTP secret saved",
				message: path,
			});
			onSaved?.();
			pop();
		} catch (error) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Failed to save OTP secret",
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
					<Action.SubmitForm title="Save OTP Secret" onSubmit={handleSubmit} />
				</ActionPanel>
			}
		>
			<Form.Description title="Entry" text={path} />
			<Form.TextArea
				id="secret"
				title="Secret or URI"
				placeholder="JBSWY3DPEHPK3PXP or otpauth://totp/..."
				info="Paste an otpauth:// URI, or a bare base32 secret"
			/>
			<Form.TextField id="issuer" title="Issuer" placeholder="Optional when using a bare secret" />
			<Form.TextField
				id="account"
				title="Account"
				placeholder="Optional when using a bare secret"
			/>
		</Form>
	);
}
