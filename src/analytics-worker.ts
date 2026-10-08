import { startAnalyticsWorker } from "./modules/analytics/analytics.worker.js";

startAnalyticsWorker().catch((error) => {
    console.error("Analytics worker failed:", error);
    process.exit(1);
});