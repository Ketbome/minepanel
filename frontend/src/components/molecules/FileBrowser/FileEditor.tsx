"use client";

import { FC, useState, useCallback, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  // The last saved text: after a save the parent passes the new one, which is what
  // "unsaved" is measured against.
  content: string;
  onSave: (content: string) => Promise<boolean>;
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
  const [confirmClose, setConfirmClose] = useState(false);
  // While the dialog's save is in flight nothing else may decide: a Cancel followed by
  // a late success would otherwise close the editor over edits made in the meantime.
  const [closingSave, setClosingSave] = useState(false);
  const hasChanges = editedContent !== content;

  // Leaving the page (reload, closing the tab) would drop the edits just as silently.
  useEffect(() => {
    if (!hasChanges) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasChanges]);

  const requestClose = useCallback(() => {
    if (hasChanges) setConfirmClose(true);
    else onClose();
  }, [hasChanges, onClose]);

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

  // Monaco swallows keys typed inside it, so the container's handler never sees Ctrl+S
  // there; the command is registered on the editor itself and reads the latest state.
  const saveShortcutRef = useRef(() => {});
  saveShortcutRef.current = () => {
    if (hasChanges && !isSaving) handleSave();
  };

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
      className="flex flex-col h-[70vh] min-h-[480px] bg-gray-900/60 border border-gray-700/50 rounded-lg overflow-hidden"
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700/50"
            onClick={requestClose}
            aria-label={t("close")}
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
          variant="minepanel"
          className="gap-2 disabled:opacity-50"
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
          onMount={(editor, monaco) => {
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveShortcutRef.current());
          }}
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

      <Dialog open={confirmClose} onOpenChange={(open) => !closingSave && setConfirmClose(open)}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-200">{t("unsavedChanges")}</DialogTitle>
          </DialogHeader>
          <p className="text-gray-400">{t("fmUnsavedMessage").replace("{name}", fileName)}</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmClose(false)} disabled={closingSave}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={onClose} disabled={closingSave}>
              {t("discardChanges")}
            </Button>
            <Button
              variant="minepanel"
              disabled={closingSave}
              className="gap-2"
              onClick={async () => {
                setClosingSave(true);
                const saved = await onSave(editedContent);
                setClosingSave(false);
                if (saved) onClose();
                else setConfirmClose(false);
              }}
            >
              {closingSave && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
