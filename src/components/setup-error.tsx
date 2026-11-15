import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@vicinae/api";
import { PassNotInstalledError, PassStoreMissingError, PassTimeoutError } from "../pass";
import { errorMessage } from "../utils/errors";

type SetupErrorViewProps = {
	error: unknown;
	onRetry?: () => void;
};

function titleFor(error: unknown): string {
	if (error instanceof PassNotInstalledError) {
		return "pass is not installed";
	}
	if (error instanceof PassStoreMissingError) {
		return "Password store not found";
	}
	if (error instanceof PassTimeoutError) {
		return "Waiting for GPG passphrase";
	}
	return "Password store unavailable";
}

function descriptionFor(error: unknown): string {
	if (error instanceof PassNotInstalledError) {
		return "Install pass, or add its directory to Additional PATH Entries in extension preferences.";
	}
	if (error instanceof PassStoreMissingError) {
		return "Check the Password Store Directory preference, or run pass init.";
	}
	if (error instanceof PassTimeoutError) {
		return "Unlock your GPG key with pinentry, then retry.";
	}
	return errorMessage(error);
}

export function SetupErrorView({ error, onRetry }: SetupErrorViewProps) {
	return (
		<List>
			<List.EmptyView
				icon={Icon.Warning}
				title={titleFor(error)}
				description={descriptionFor(error)}
				actions={
					<ActionPanel>
						{onRetry ? (
							<Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />
						) : null}
						<Action
							title="Open Extension Preferences"
							icon={Icon.Cog}
							onAction={openExtensionPreferences}
						/>
					</ActionPanel>
				}
			/>
		</List>
	);
}
