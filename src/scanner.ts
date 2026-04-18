import type { Dirent } from "node:fs";
import { readdir, access } from "node:fs/promises";
import path from "node:path";

import {
	type Manifest,
	validateManifest,
	VALID_MANIFEST_NAMES,
} from "./manifest.js";
import { parseFile } from "./parser.js";

export interface Project {
	type: "validProject";
	projectRoot: string;
	manifestPath: string;
	composeFilePath: string;
	manifest: Manifest;
}
export interface InvalidProject {
	type: "invalidProject";
	projectRoot: string;
	reason: string;
}

async function createProject(
	manifestDirent: Dirent,
): Promise<Project | InvalidProject> {
	const projectRoot = manifestDirent.parentPath;
	const manifestPath = path.join(projectRoot, manifestDirent.name);

	let parsedManifest: unknown;
	try {
		parsedManifest = await parseFile(manifestPath);
	} catch (err) {
		return {
			type: "invalidProject",
			projectRoot: projectRoot,
			reason: err instanceof Error ? err.message : String(err),
		};
	}
	const validateManifestResult = validateManifest(parsedManifest);

	if (!validateManifestResult.ok) {
		return {
			type: "invalidProject",
			projectRoot: projectRoot,
			reason: validateManifestResult.value,
		};
	}

	const manifest: Manifest = validateManifestResult.value;
	const composeFilePath = path.join(projectRoot, manifest.composeFile);

	try {
		await access(composeFilePath);
	} catch {
		return {
			type: "invalidProject",
			projectRoot: projectRoot,
			reason: `Given compose file doesn't exist: composeFile = "${composeFilePath}"`,
		};
	}

	return {
		type: "validProject",
		projectRoot: projectRoot,
		manifestPath: manifestPath,
		composeFilePath: composeFilePath,
		manifest: manifest,
	};
}

async function getManifestFile(path: string): Promise<Dirent | undefined> {
	try {
		const files = await readdir(path, { withFileTypes: true });
		for (const file of files) {
			if (file.isFile() && VALID_MANIFEST_NAMES.includes(file.name))
				return file;
		}
		return undefined;
	} catch (err) {
		throw new Error(`Couldn't read path: ${path}`, { cause: err });
	}
}

async function getProject(
	projectDirectory: Dirent,
): Promise<Project | InvalidProject | undefined> {
	const manifestFile = await getManifestFile(
		path.join(projectDirectory.parentPath, projectDirectory.name),
	);
	if (manifestFile == undefined) return undefined;
	return await createProject(manifestFile);
}

export async function scanProjects(
	projectParentPaths: string[],
): Promise<{ projects: Project[]; invalidProjects: InvalidProject[] }> {
	if (projectParentPaths.length == 0)
		throw new Error("No project parent paths given");

	const projects: Project[] = [];
	const invalidProjects: InvalidProject[] = [];

	for (const projectParentPath of projectParentPaths) {
		const projectDirectories: Dirent[] = await readdir(projectParentPath, {
			withFileTypes: true,
		});

		for (const projectDirectory of projectDirectories) {
			if (!projectDirectory.isDirectory()) continue;

			const project = await getProject(projectDirectory);

			// ignore undefined, because those have no manifest.
			if (project != undefined) {
				if (project.type == "validProject") {
					projects.push(project);
				} else if (project.type == "invalidProject") {
					invalidProjects.push(project);
				}
			}
		}
	}
	return { projects, invalidProjects };
}
