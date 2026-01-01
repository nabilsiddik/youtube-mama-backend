import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import appRouter from "./route/index.js";
export const app: Application = express();

// Global middlawares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// cors setup
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://youtube-mama-frontend.vercel.app",
    ],
    credentials: true,
  })
);

// Check server running status
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running...",
  });
});

// Call global application router
app.use("/api/v1", appRouter);

// Not found route handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// global error handler
app.use((err: any, req: Request, res: Response) => {
  res.status(err?.status || 500).json({
    success: false,
    message: "Internal server Error",
  });
});
