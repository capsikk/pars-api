const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const tasks = [];          // Очередь заданий
const results = new Map(); // Результаты по taskId

app.post("/add-task", (req, res) => {
  const { url, xpaths } = req.body;
  if (!url || !Array.isArray(xpaths)) return res.status(400).json({ error: "Invalid input" });

  const taskId = uuidv4();
  tasks.push({ taskId, url, xpaths });
  res.json({ taskId });
});

app.get("/next-task", (req, res) => {
  const task = tasks.shift();
  if (!task) return res.json({ task: null });
  res.json({ task });
});

app.post("/submit-result", (req, res) => {
  const { taskId, data } = req.body;
  if (!taskId || !data) return res.status(400).json({ error: "Missing taskId or data" });

  results.set(taskId, data);
  res.json({ success: true });
});

app.get("/result", (req, res) => {
  const { taskId } = req.query;
  if (!taskId) return res.status(400).json({ error: "Missing taskId" });

  const result = results.get(taskId);
  if (!result) return res.json({ ready: false });

  res.json({ ready: true, data: result });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Render API running on ${PORT}`));
