import dns from "node:dns";

dns.setServers([
    "8.8.8.8",
]);

dns.setDefaultResultOrder("ipv4first");


import { startAnalyticsWorker } from "./modules/analytics/analytics.worker.js";

startAnalyticsWorker().catch((error) => {
    console.error("Analytics worker failed:", error);
    process.exit(1);
});