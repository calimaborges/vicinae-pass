/// <reference types="@vicinae/api">

/*
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 */

type ExtensionPreferences = {
  /** Password Store Directory - Path to your password store (defaults to ~/.password-store) */
	"storePath"?: string;

	/** Additional PATH Entries - Colon-separated directories prepended to PATH so Homebrew and custom pass binaries resolve */
	"extraPath"?: string;
}

declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Command: Search Passwords */
	export type Browse = ExtensionPreferences & {
		
	}

	/** Command: Create Password */
	export type Create = ExtensionPreferences & {
		
	}

	/** Command: Generate Password */
	export type Generate = ExtensionPreferences & {
		
	}
}

declare namespace Arguments {
  /** Command: Search Passwords */
	export type Browse = {
		
	}

	/** Command: Create Password */
	export type Create = {
		
	}

	/** Command: Generate Password */
	export type Generate = {
		
	}
}