import { Action, ActionPanel, Icon, List } from "@vicinae/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EntryActions } from "./components/entry-actions";
import { SetupErrorView } from "./components/setup-error";
import { listEntries, type StoreEntry } from "./pass";
import { getPassConfig } from "./preferences";
import { errorMessage, isRecoverableSetupError } from "./utils/errors";
import { EntryForm } from "./views/entry-form";
import { GenerateForm } from "./views/generate-form";

function formatMtime(mtimeMs: number): string {
	try {
		return new Date(mtimeMs).toLocaleString();
	} catch {
		return "";
	}
}

export default function BrowseCommand() {
	const [entries, setEntries] = useState<StoreEntry[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<unknown>(null);
	const [searchText, setSearchText] = useState("");

	const refresh = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const listed = await listEntries(getPassConfig());
			setEntries(listed);
		} catch (loadError) {
			setEntries([]);
			setError(loadError);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const filtered = useMemo(() => {
		const needle = searchText.trim().toLowerCase();
		if (!needle) {
			return entries;
		}
		return entries.filter((entry) => entry.path.toLowerCase().includes(needle));
	}, [entries, searchText]);

	if (error && isRecoverableSetupError(error)) {
		return <SetupErrorView error={error} onRetry={refresh} />;
	}

	return (
		<List
			isLoading={isLoading}
			searchBarPlaceholder="Search passwords"
			onSearchTextChange={setSearchText}
			filtering={false}
			actions={
				<ActionPanel>
					<Action.Push
						title="Create Password"
						icon={Icon.Plus}
						target={<EntryForm mode="create" onSaved={() => void refresh()} />}
					/>
					<Action.Push
						title="Generate Password"
						icon={Icon.Key}
						target={<GenerateForm onSaved={() => void refresh()} />}
					/>
					<Action title="Reload" icon={Icon.ArrowClockwise} onAction={refresh} />
				</ActionPanel>
			}
		>
			{error ? (
				<List.EmptyView
					icon={Icon.Warning}
					title="Failed to load passwords"
					description={errorMessage(error)}
					actions={
						<ActionPanel>
							<Action title="Retry" icon={Icon.ArrowClockwise} onAction={refresh} />
						</ActionPanel>
					}
				/>
			) : filtered.length === 0 ? (
				<List.EmptyView
					icon={Icon.Key}
					title={searchText ? "No matching entries" : "No passwords found"}
					description={
						searchText
							? "Try a different search."
							: "Create an entry with pass insert, or use Create Password."
					}
					actions={
						<ActionPanel>
							<Action.Push
								title="Create Password"
								icon={Icon.Plus}
								target={<EntryForm mode="create" onSaved={() => void refresh()} />}
							/>
							<Action.Push
								title="Generate Password"
								icon={Icon.Key}
								target={<GenerateForm onSaved={() => void refresh()} />}
							/>
							<Action title="Reload" icon={Icon.ArrowClockwise} onAction={refresh} />
						</ActionPanel>
					}
				/>
			) : (
				filtered.map((entry) => (
					<List.Item
						key={entry.path}
						id={entry.path}
						title={entry.name}
						subtitle={entry.folder ?? undefined}
						icon={Icon.Key}
						accessories={[{ text: formatMtime(entry.mtimeMs) }]}
						keywords={[entry.path, entry.name, entry.folder ?? ""]}
						actions={<EntryActions entry={entry} onChanged={refresh} />}
					/>
				))
			)}
		</List>
	);
}
