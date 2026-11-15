import type { Form } from "@vicinae/api";

export function formString(values: Form.Values, key: string, fallback = ""): string {
	const value = values[key];
	return typeof value === "string" ? value : fallback;
}

export function formBoolean(values: Form.Values, key: string, fallback = false): boolean {
	const value = values[key];
	return typeof value === "boolean" ? value : fallback;
}
