import express from "express";

import { scanProjects } from "./scanner.js";
import { validateManifest } from "./manifest.js";
import { parseFile } from "./parser.js";

const app = express();
const port = 3000;

app.get("/api/health", (req, res) => {
	res.send({ status: "ok" });
});

app.get("/api/scan", async (req, res) => {
	const { projects, invalidProjects } = await scanProjects([
		"./tests/test_projects",
	]);
	res.send(projects);
	//res.send(invalidProjects);
});

app.get("/api/validate", async (req, res) => {
	const parsed = await parseFile(
		"./tests/test_projects/factorio/manipanel.toml",
	);
	const manifestResult = validateManifest(parsed);
	console.log(manifestResult.ok);
	res.send(manifestResult.value);
});

app.listen(port, () => {
	console.log(`Listening on port ${port}`);
});
