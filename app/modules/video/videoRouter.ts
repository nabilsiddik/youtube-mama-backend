import { Router, type Request, type Response } from "express";
import { spawn } from "child_process";

const videoRouter = Router();

// Get full video info
videoRouter.get("/info", (req: Request, res: Response) => {
  const { url } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).json({
      success: false,
      message: "url query param is required",
    });
  }

  // Spawn yt-dlp process
  const ytDlp = spawn("yt-dlp", ["-j", url]);

  let data = "";
  let errorData = "";

  // Collect stdout data
  ytDlp.stdout.on("data", (chunk) => {
    data += chunk.toString();
  });

  // Collect stderr data
  ytDlp.stderr.on("data", (chunk) => {
    errorData += chunk.toString();
  });

  ytDlp.on("close", (code) => {
    if (errorData) {
      console.error("yt-dlp error:", errorData);
    }

    if (code !== 0) {
      return res.status(500).json({
        success: false,
        message: "yt-dlp failed to fetch video info",
        error: errorData,
      });
    }

    try {
      const info = JSON.parse(data);
      res.json({
        success: true,
        info,
      });
    } catch (e) {
      console.error("Failed to parse yt-dlp output:", e);
      res.status(500).json({
        success: false,
        message: "Failed to parse video info",
      });
    }
  });
});

// Downlod thumbnail
videoRouter.get("/thumbnail", async (req: Request, res: Response) => {
  const { url } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ message: "url is required" });
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(500).json({ message: "Failed to fetch image" });
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Type", "image/webp");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="thumbnail.webp"'
    );

    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error downloading image" });
  }
});

export default videoRouter;
