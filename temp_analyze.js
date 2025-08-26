const fs = require("fs");
const data = JSON.parse(fs.readFileSync("TaskFuchs-Backup-2025-07-31_Unique.json", "utf8"));
console.log("📊 JSON Analysis:");
console.log("Version:", data.version);
console.log("Tasks with kanbanColumnId:", data.tasks.filter(t => t.kanbanColumnId).length);
console.log("Unique kanbanColumnIds:", [...new Set(data.tasks.filter(t => t.kanbanColumnId).map(t => t.kanbanColumnId))]);
console.log("Projects:", data.columns.filter(c => c.type === "project").map(c => c.title));
console.log("Has projectKanbanColumns:", !!data.projectKanbanColumns);
console.log("Has viewState:", !!data.viewState);
