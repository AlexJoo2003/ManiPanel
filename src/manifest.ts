import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "smol-toml";

export interface Manifest {
	name: string;
	compose_file: string;
	description?: string;
	command: Command[];
}
export interface Command {
	id: string;
	enabled: boolean;
	label?: string;
	description?: string;
	script: string;
	cooldown?: number;
	danger?: boolean;
	confirm?: string;
}

async function readManifest(path: string): Promise<string> {
	try {
		const filePath = resolve(path);
		const contents = await readFile(filePath, { encoding: "utf8" });
		return contents;
	} catch (err) {
		throw new Error(`Couldn't read manifest at ${path}`, { cause: err });
	}
}

async function parseTOML(path: string): Promise<Manifest> {
	const contents = await readManifest(path);
	const parsed = parse(contents);
	const result: Manifest = parsed as unknown as Manifest;
	return result;
}

export async function parseManifest(path: string): Promise<Manifest> {
	const extension = path.split(".").at(-1);
	switch (extension) {
		case "toml":
			return parseTOML(path);
		default:
			console.log("unsupported extension.");
			throw new Error(`Couldn't parse manifest at ${path}`);
	}
}
