"use client";

import { FC, useState, useCallback } from "react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamic import for Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-950">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
    </div>
  ),
});

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
    properties: "ini",
    cfg: "ini",
    conf: "ini",
    toml: "ini",
    ini: "ini",
    sh: "shell",
    bat: "bat",
    md: "markdown",
    txt: "plaintext",
    log: "plaintext",
    mcmeta: "json",
    lang: "ini",
    js: "javascript",
    ts: "typescript",
    java: "java",
  };
  return langMap[ext || ""] || "plaintext";
};

export const FileEditor: FC<FileEditorProps> = ({ path, content, onSave, onClose }) => {
  const { t } = useLanguage();
  const [editedContent, setEditedContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);
  const hasChanges = editedContent !== content;

  const fileName = path.split("/").pop() || path;
  const language = getLanguageFromPath(path);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    await onSave(editedContent);
    setIsSaving(false);
  }, [editedContent, onSave]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    setEditedContent(value || "");
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasChanges) handleSave();
      }
    },
    [hasChanges, handleSave]
  );

  return (
    <div
      className="flex flex-col h-[600px] bg-gray-900/60 border border-gray-700/50 rounded-lg overflow-hidden"
      onKeyDown={handleKeyDown}
    >
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
          <div className="flex items-center gap-2">
            <span className="text-gray-200 font-medium">{fileName}</span>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{language}</span>
          </div>
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
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSaving ? t("saving") : t("save")}
        </Button>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <MonacoEditor
          height="100%"
          language={language}
          value={editedContent}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            lineNumbers: "on",
            wordWrap: "on",
            automaticLayout: true,
            scrollBeyondLastLine: false,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: "line",
            cursorBlinking: "smooth",
            smoothScrolling: true,
            tabSize: 2,
            folding: true,
            bracketPairColorization: { enabled: true },
          }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/30 border-t border-gray-700/50 text-xs text-gray-500">
        <span>{path}</span>
        <span>Ctrl+S {t("toSave")}</span>
      </div>
    </div>
  );
};
