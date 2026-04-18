import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { parse } from "smol-toml";

async function getContent(path: string): Promise<string> {
	try {
		const filePath = resolve(path);
		const contents = await readFile(filePath, { encoding: "utf8" });
		return contents;
	} catch (err) {
		throw new Error(`Couldn't read file at ${path}`, { cause: err });
	}
}

async function parseTOML(path: string): Promise<unknown> {
	const contents = await getContent(path);
	const parsed = parse(contents);
	const result = parsed as unknown;
	return result;
}

export async function parseFile(path: string): Promise<unknown> {
	const extension = extname(path);
	switch (extension) {
		case ".toml":
			return parseTOML(path);
		default:
			console.log("unsupported extension.");
			throw new Error(`Couldn't parse file at ${path}`);
	}
}
