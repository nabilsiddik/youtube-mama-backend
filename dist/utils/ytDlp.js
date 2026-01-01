import { spawn } from "child_process";
export const YT_DLP_PATH = process.env.YT_DLP_PATH || "yt-dlp";
export function spawnYtDlp(args) {
    const child = spawn(YT_DLP_PATH, args);
    child.on("error", (err) => {
        console.error("yt-dlp spawn failed:", err.message);
    });
    return child;
}
//# sourceMappingURL=ytDlp.js.map