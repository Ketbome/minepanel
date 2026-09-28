import { FileItem } from "@/services/files/files.service";

// The one list of what opens in the text editor: the toolbar, the context menu and
// Enter must agree. Binary formats stay out even when they are "Minecraft" files:
// .nbt (level.dat and friends) is gzip, and saving it back as UTF-8 corrupts it.
const TEXT_EXTENSIONS = new Set([
  // Config
  "txt", "json", "yml", "yaml", "properties", "cfg", "conf", "xml", "toml", "ini",
  // Scripts
  "sh", "bat", "ps1", "cmd",
  // Docs
  "md", "log", "csv",
  // Minecraft
  "mcmeta", "lang", "mcfunction", "snbt",
  // Code
  "java", "js", "ts", "py", "lua", "sk",
  // Web / data
  "html", "css", "scss", "sql",
]);

export const isEditableFile = (file: FileItem): boolean =>
  !file.isDirectory && Boolean(file.extension) && TEXT_EXTENSIONS.has(file.extension!.toLowerCase());
