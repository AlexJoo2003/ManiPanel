import type { Dirent } from "node:fs";
import { readdir, access } from "node:fs/promises";
import path from "node:path";

import { type Manifest, validateManifest, VALID_MANIFEST_NAMES } from "./manifest.js";
import { parseFile } from "./parser.js";

export interface Project {
	valid: true;
	projectRoot: string;
	manifestPath: string;
	composeFilePath: string;
	manifest: Manifest;
}
export interface InvalidProject {
	valid: false;
	projectRoot: string;
	reason: string;
}

async function createProject(manifestDirent: Dirent): Promise<Project | InvalidProject> {
	const projectRoot = manifestDirent.parentPath;
	const manifestPath = path.join(projectRoot, manifestDirent.name);

	let parsedManifest: unknown;
	try {
		parsedManifest = await parseFile(manifestPath);
	} catch (err) {
		return {
			valid: false,
			projectRoot: projectRoot,
			reason: err instanceof Error ? err.message : String(err),
		};
	}
	const validateManifestResult = validateManifest(parsedManifest);

	if (!validateManifestResult.ok) {
		return {
			valid: false,
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
			valid: false,
			projectRoot: projectRoot,
			reason: `Given compose file doesn't exist: composeFile = "${composeFilePath}"`,
		};
	}

	return {
		valid: true,
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
			if (file.isFile() && VALID_MANIFEST_NAMES.includes(file.name)) return file;
		}
		return undefined;
	} catch (err) {
		throw new Error(`Couldn't read path: ${path}`, { cause: err });
	}
}

async function getProject(projectDirectory: Dirent): Promise<Project | InvalidProject | undefined> {
	const manifestFile = await getManifestFile(path.join(projectDirectory.parentPath, projectDirectory.name));
	if (manifestFile == undefined) return undefined;
	return await createProject(manifestFile);
}

export async function scanProjects(
	projectParentPaths: string[],
): Promise<{ projects: Map<string, Project>; invalidProjects: InvalidProject[] }> {
	if (projectParentPaths.length == 0) throw new Error("No project parent paths given");

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
				if (project.valid) {
					projects.push(project);
				} else {
					invalidProjects.push(project);
				}
			}
		}
	}
	return { projects: indexProjects(projects, invalidProjects), invalidProjects: invalidProjects };
}

// returns a mapped project and mutates invalidProjects
function indexProjects(projects: Project[], invalidProjects: InvalidProject[]) {
	const projectsMap = new Map<string, Project>();

	const seenIds = new Set<string>();
	const duplicateIds = new Set<string>();
	for (const project of projects) {
		if (seenIds.has(project.manifest.id)) duplicateIds.add(project.manifest.id);
		else seenIds.add(project.manifest.id);
	}
	for (const project of projects) {
		if (duplicateIds.has(project.manifest.id))
			invalidProjects.push({
				valid: false,
				projectRoot: project.projectRoot,
				reason: `Duplicate id: ${project.manifest.id} at ${project.manifestPath}`,
			});
		else {
			projectsMap.set(project.manifest.id, project);
		}
	}
	return projectsMap;
}
