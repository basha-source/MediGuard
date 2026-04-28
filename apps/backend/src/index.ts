import "./config/env"; // validates all env vars first — throws if any are missing
import express from "express";
import cors    from "cors";

import { medicineRoutes }     from "./routes/medicines";
import { interactionRoutes }  from "./routes/interactions";
import { aiRoutes }           from "./routes/ai";
import { notificationRoutes } from "./routes/notifications";
import { ENV }                from "./config/env";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/medicines",     medicineRoutes);
app.use("/api/interactions",  interactionRoutes);
app.use("/api/ai",            aiRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/health", (_req, res) => res.json({ status: "ok", app: "MediGuard API" }));

app.listen(ENV.PORT, () => console.log(`MediGuard API running on port ${ENV.PORT}`));
