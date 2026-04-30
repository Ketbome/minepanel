import { FC } from "react";
import { Button } from "@/components/ui/button";
import { Save, AlertCircle } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";

interface SaveModeControlProps {
  onManualSave: () => Promise<boolean>;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}

export const SaveModeControl: FC<SaveModeControlProps> = ({ onManualSave, isSaving, hasUnsavedChanges }) => {
  const { t } = useLanguage();

  if (!hasUnsavedChanges && !isSaving) {
    return null;
  }

  const handleManualSave = async () => {
    try {
      await onManualSave();
    } catch (error) {
      console.error("Error saving:", error);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 px-4">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 rounded-xl border border-gray-700/60 bg-gray-900/90 p-3 shadow-2xl backdrop-blur-md animate-fade-in-up">
        <div className="flex items-center gap-2 text-sm text-amber-400">
          {isSaving ? <Save className="h-4 w-4 animate-spin text-blue-400" /> : <AlertCircle className="h-4 w-4 animate-pulse" />}
          <span className="font-minecraft text-xs sm:text-sm">
            {isSaving ? t("saving") : t("unsavedChanges")}
          </span>
        </div>

        <Button
          type="button"
          onClick={handleManualSave}
          disabled={isSaving || !hasUnsavedChanges}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-minecraft gap-2 transition-all disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {t("saveChanges")}
        </Button>
      </div>
    </div>
  );
};
