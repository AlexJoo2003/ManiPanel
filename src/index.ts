import express from "express";
import { parseManifest } from "./manifest.js";
import { type Manifest } from "./manifest.js";

const app = express();
const port = 3000;

app.get("/api/health", (req, res) => {
	res.send({ status: "ok" });
});

app.get("/api/test", async (req, res) => {
	try {
		const data: Manifest = await parseManifest(
			"test_projects/test_project/manipanel.toml",
		);
		res.send(data);
	} catch (err) {
		res.status(500).send(`Error parsing manifest: ${err}`);
	}
});

app.listen(port, () => {
	console.log(`Listening on port ${port}`);
});
