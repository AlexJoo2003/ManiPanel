import express from "express";
const app = express();
const port = 3000;

app.get("/api/health", (req, res) => {
	res.send({ status: "ok" });
});

app.listen(port, () => {
	console.log(`Listening on port ${port}`);
});
