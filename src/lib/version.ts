import fs from "fs";
import path from "path";

export function getAppVersion(): string {
  try {
    return fs.readFileSync(path.join(process.cwd(), "VERSION"), "utf-8").trim();
  } catch {
    return "0.0.0";
  }
}
