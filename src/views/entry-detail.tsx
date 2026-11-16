import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@vicinae/api";
import { useEffect, useState } from "react";
import { generateTotpFromUri, nonUsernameFields, type ParsedEntry, showEntry } from "../pass";
import { getPassConfig } from "../preferences";
import { copyConcealed, pasteValue } from "../utils/clipboard";
import { errorMessage } from "../utils/errors";

function buildMarkdown(entry: ParsedEntry, otpLine: string | null): string {
	const sections = [`# Password`, "```", entry.password, "```"];

	if (entry.username) {
		sections.push("", `**Username:** \`${entry.username}\``);
	}

	if (otpLine) {
		sections.push("", `## OTP`, otpLine);
	}

	const customFields = nonUsernameFields(entry.fields);
	if (customFields.length > 0) {
		sections.push("", "## Fields");
		for (const field of customFields) {
			sections.push(`- **${field.key}:** \`${field.value}\``);
		}
	}

	if (entry.notes.length > 0) {
		sections.push("", "## Notes", entry.notes.join("\n"));
	}

	return sections.join("\n");
}

export function EntryDetailView({ path }: { path: string }) {
	const [entry, setEntry] = useState<ParsedEntry | null>(null);
	const [otpLine, setOtpLine] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		let timer: ReturnType<typeof setInterval> | undefined;

		void (async () => {
			try {
				const loaded = await showEntry(getPassConfig(), path);
				if (cancelled) {
					return;
				}
				setEntry(loaded);

				const refreshOtp = () => {
					if (!loaded.otpauthUri) {
						setOtpLine(null);
						return;
					}
					try {
						const code = generateTotpFromUri(loaded.otpauthUri);
						setOtpLine(`\`${code.code}\` (${code.remainingSeconds}s remaining)`);
					} catch (otpError) {
						setOtpLine(errorMessage(otpError));
					}
				};

				refreshOtp();
				if (loaded.otpauthUri) {
					timer = setInterval(refreshOtp, 1000);
				}
			} catch (loadError) {
				if (!cancelled) {
					setError(errorMessage(loadError));
				}
			}
		})();

		return () => {
			cancelled = true;
			if (timer) {
				clearInterval(timer);
			}
		};
	}, [path]);

	if (error) {
		return <Detail markdown={`# Error\n\n${error}`} />;
	}

	if (!entry) {
		return <Detail isLoading markdown="Loading..." />;
	}

	const customFields = nonUsernameFields(entry.fields);

	return (
		<Detail
			navigationTitle={path}
			markdown={buildMarkdown(entry, otpLine)}
			actions={
				<ActionPanel>
					<Action
						title="Copy Password"
						icon={Icon.Key}
						onAction={async () => {
							await copyConcealed("password", entry.password);
						}}
					/>
					<Action
						title="Paste Password"
						icon={Icon.Text}
						onAction={async () => {
							await pasteValue(entry.password);
						}}
					/>
					{entry.username ? (
						<>
							<Action
								title="Copy Username"
								icon={Icon.Person}
								onAction={async () => {
									const username = entry.username;
									if (!username) {
										return;
									}
									await copyConcealed("username", username);
								}}
							/>
							<Action
								title="Paste Username"
								icon={Icon.Person}
								onAction={async () => {
									const username = entry.username;
									if (!username) {
										return;
									}
									await pasteValue(username);
								}}
							/>
						</>
					) : null}
					{entry.otpauthUri ? (
						<>
							<Action
								title="Copy OTP Code"
								icon={Icon.Clock}
								onAction={async () => {
									const otpauthUri = entry.otpauthUri;
									if (!otpauthUri) {
										return;
									}
									try {
										const code = generateTotpFromUri(otpauthUri);
										await copyConcealed("OTP code", code.code);
									} catch (otpError) {
										await showToast({
											style: Toast.Style.Failure,
											title: "Failed to generate OTP",
											message: errorMessage(otpError),
										});
									}
								}}
							/>
							<Action
								title="Paste OTP Code"
								icon={Icon.Clock}
								onAction={async () => {
									const otpauthUri = entry.otpauthUri;
									if (!otpauthUri) {
										return;
									}
									try {
										const code = generateTotpFromUri(otpauthUri);
										await pasteValue(code.code);
									} catch (otpError) {
										await showToast({
											style: Toast.Style.Failure,
											title: "Failed to generate OTP",
											message: errorMessage(otpError),
										});
									}
								}}
							/>
						</>
					) : null}
					{customFields.flatMap((field) => [
						<Action
							key={`copy-${field.key}`}
							title={`Copy ${field.key}`}
							icon={Icon.CopyClipboard}
							onAction={async () => {
								await copyConcealed(field.key, field.value);
							}}
						/>,
						<Action
							key={`paste-${field.key}`}
							title={`Paste ${field.key}`}
							icon={Icon.Text}
							onAction={async () => {
								await pasteValue(field.value);
							}}
						/>,
					])}
				</ActionPanel>
			}
		/>
	);
}
