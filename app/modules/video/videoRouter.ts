import ytdlp from "yt-dlp-exec";
import ytdlpExec from "yt-dlp-exec";
import { Router, type Request, type Response } from "express";
import path from "path";
import fs from "fs";
import axios from "axios";
import { parseJson3Captions } from "../../utils/parseJson3Captions.js";

const videoRouter = Router();

// Get full video info
videoRouter.get("/info", async (req: Request, res: Response) => {
  const { url } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).json({
      success: false,
      message: "url query param is required",
    });
  }

  try {
    const info = await ytdlp(url, {
      dumpSingleJson: true,
      noPlaylist: true,
    });

    return res.json({
      success: true,
      info,
    });
  } catch (error) {
    console.error("yt-dlp info error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch video info",
    });
  }
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
videoRouter.get("/download", async (req: Request, res: Response) => {
  const videoUrl = req.query.videoUrl as string;
  if (!videoUrl) {
    return res.status(400).json({ message: "URL is required" });
  }

  try {
    const downloadsDir = path.join(process.cwd(), "downloads");
    if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir);

    const outputFile = path.join(downloadsDir, "video.mp4");

    await ytdlpExec(videoUrl, {
      format: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4",
      mergeOutputFormat: "mp4",
      output: outputFile,
      noPlaylist: true,
    });

    // Send file to client
    res.download(outputFile, "video.mp4", (err) => {
      if (err) console.error(err);
      if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// download audio of youtube video
videoRouter.get("/audio", async (req: Request, res: Response) => {
  let videoUrl = req.query.videoUrl as string | undefined;

  if (!videoUrl) {
    return res.status(400).json({
      message: "Video URL is required while downloading audio",
    });
  }

  // Strip playlist
  if (videoUrl.includes("youtube.com/watch") && videoUrl.includes("list=")) {
    videoUrl = videoUrl.split("&")[0];
  }

  try {
    const downloadsDir = path.join(process.cwd(), "downloads");
    if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir);

    const outputFile = path.join(downloadsDir, "audio.m4a");

    // ✅ Use only known YtFlags
    await ytdlpExec(videoUrl as string, {
      format: "bestaudio[ext=m4a]/bestaudio",
      output: outputFile,
      noPlaylist: true,
      // noLiveFromStart removed
    });

    res.download(outputFile, "audio.m4a", (err) => {
      if (err) console.error(err);

      // Delete temp file
      if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
    });
  } catch (error) {
    console.error("Audio download failed:", error);
    res.status(500).json({ message: "Failed to download audio" });
  }
});

// Get captions
videoRouter.get("/captions", async (req: Request, res: Response) => {
  const { captionUrl } = req.query as { captionUrl?: string };

  if (!captionUrl) {
    return res.status(400).json({ message: "captionUrl is required" });
  }

  try {
    const response = await axios.get(captionUrl, {
      responseType: "json",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    return res.json(response.data);
  } catch (error) {
    console.error("Caption fetch failed:", error);
    return res.status(500).json({ message: "Failed to fetch captions" });
  }
});

// Get parsed caption
videoRouter.get("/captions/parsed", async (req: Request, res: Response) => {
  try {
    const { captionUrl } = req.query as { captionUrl?: string };
    if (!captionUrl) return res.status(400).json({});

    const json = (await axios.get(captionUrl)).data;
    const segments = parseJson3Captions(json);

    res.json(segments);
  } catch (err) {
    console.error("Caption parsing failed:", err);
    res.status(500).json({ message: "Failed to parse captions" });
  }
});

export default videoRouter;
