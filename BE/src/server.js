import "dotenv/config";
import app from "./app.js";

import { warmConnectionPool } from "./configs/db.config.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Who's Free Backend server running on http://localhost:${PORT}`);
  console.log(`📡 API Healthcheck available at: http://localhost:${PORT}/api/health`);
  warmConnectionPool();
});
