import * as z from "zod";

export const VALID_MANIFEST_NAMES: string[] = ["manipanel.toml"];

export type Manifest = z.infer<typeof ManifestSchema>;
export type Command = z.infer<typeof CommandSchema>;

const CommandSchema = z
	.object({
		id: z.string(),
		enabled: z.boolean().default(true),
		label: z.string().default(""),
		description: z.string().default(""),
		script: z.string().default(""),
		cooldown: z.number().default(0),
		danger: z.boolean().default(false),
		confirm: z.string().default(""),
	})
	.transform((command) => ({
		...command,
		label: command.label === "" ? command.id : command.label,
	}));

const ManifestSchema = z
	.object({
		id: z.string(),
		label: z.string().default(""),
		composeFile: z.string(),
		description: z.string().default(""),
		command: z.array(CommandSchema).default([]), // command instead of commands, because command looks nicer in toml
	})
	.superRefine((manifest, ctx) => {
		const ids = new Set<string>();
		manifest.command.forEach((command, index) => {
			if (ids.has(command.id)) {
				ctx.addIssue({
					code: "custom",
					message: `Duplicate command id ${command.id} in manifest: ${manifest.label}`,
					input: command.id,
					path: ["command", index, "id"],
				});
			}
			ids.add(command.id);
		});
	})
	.transform((manifest) => ({
		...manifest,
		label: manifest.label === "" ? manifest.id : manifest.label,
	}));

export function validateManifest(data: unknown): { ok: true; value: Manifest } | { ok: false; value: string } {
	const result = ManifestSchema.safeParse(data);
	if (result.success) {
		return { ok: true, value: result.data };
	} else {
		return { ok: false, value: z.prettifyError(result.error) };
	}
}
