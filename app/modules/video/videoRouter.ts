import { Router, type Request, type Response } from "express";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

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

// Download video
videoRouter.get("/download", async (req, res) => {
  const url = req.query.videoUrl as string;
  if (!url) return res.status(400).json({ message: "URL is required" });

  try {
    const downloadsDir = path.join(process.cwd(), "downloads");
    if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir);

    const outputFile = path.join(downloadsDir, "video.mp4");

    const ytDlp = spawn("yt-dlp", [
      "-f",
      "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4",
      "--merge-output-format",
      "mp4",
      "-o",
      outputFile,
      "--no-playlist",
      "--js-runtimes",
      "node",
      url,
    ]);

    ytDlp.stdout.on("data", (data) => console.log(data.toString()));
    ytDlp.stderr.on("data", (data) => console.error(data.toString()));

    ytDlp.on("close", (code) => {
      if (code === 0) {
        res.download(outputFile, "video.mp4", (err) => {
          if (err) console.error(err);
          if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
        });
      } else {
        res.status(500).json({ success: false, message: "Download failed" });
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// download audio of youtube video
videoRouter.get("/audio", async (req: Request, res: Response) => {
  const { videoUrl } = req.query as { videoUrl?: string };

  if (!videoUrl) {
    return res
      .status(400)
      .json({ message: "Video URL is required while downloading audio" });
  }

  let finalVideoUrl = videoUrl;

  if (
    finalVideoUrl.includes("youtube.com/watch") &&
    finalVideoUrl.includes("list=")
  ) {
    finalVideoUrl = finalVideoUrl?.split("&")?.[0] as string;
  }

  res.setHeader("Content-Disposition", 'attachment; filename="audio.m4a"');
  res.setHeader("Content-Type", "audio/mp4");

  const ytDlp = spawn("yt-dlp", [
    "--no-playlist",
    "--no-live-from-start",
    "-f",
    "bestaudio[ext=m4a]/bestaudio",
    "-o",
    "-",
    finalVideoUrl,
  ]);

  ytDlp.stdout.pipe(res);

  ytDlp.stderr.on("data", (data) => {
    console.error(data.toString());
  });

  req.on("close", () => {
    ytDlp.kill("SIGKILL");
  });

  ytDlp.on("close", () => {
    res.end();
  });
});

export default videoRouter;
