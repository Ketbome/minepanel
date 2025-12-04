"use client";

import { FC, useState } from "react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";

interface FileEditorProps {
  path: string;
  content: string;
  onSave: (content: string) => void;
  onClose: () => void;
}

const getLanguageFromPath = (path: string): string => {
  const ext = path.split(".").pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    json: "json",
    yml: "yaml",
    yaml: "yaml",
    xml: "xml",
    properties: "properties",
    cfg: "ini",
    conf: "ini",
    toml: "toml",
    ini: "ini",
    sh: "shell",
    bat: "batch",
    md: "markdown",
    txt: "plaintext",
    log: "plaintext",
  };
  return langMap[ext || ""] || "plaintext";
};

export const FileEditor: FC<FileEditorProps> = ({
  path,
  content,
  onSave,
  onClose,
}) => {
  const { t } = useLanguage();
  const [editedContent, setEditedContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);
  const hasChanges = editedContent !== content;

  const fileName = path.split("/").pop() || path;

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(editedContent);
    setIsSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      if (hasChanges) handleSave();
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-gray-900/60 border border-gray-700/50 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700/50"
            onClick={onClose}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-gray-200 font-medium">{fileName}</span>
          {hasChanges && (
            <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded">
              {t("unsaved")}
            </span>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
          size="sm"
        >
          <Save className="h-4 w-4" />
          {isSaving ? t("saving") : t("save")}
        </Button>
      </div>

      {/* Editor */}
      <div className="flex-1 relative">
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="absolute inset-0 w-full h-full bg-gray-950 text-gray-200 font-mono text-sm p-4 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
          spellCheck={false}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/30 border-t border-gray-700/50 text-xs text-gray-500">
        <span>{getLanguageFromPath(path)}</span>
        <span>Ctrl+S to save</span>
      </div>
    </div>
  );
};

