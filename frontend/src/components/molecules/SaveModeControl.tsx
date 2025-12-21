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

  const handleManualSave = async () => {
    try {
      await onManualSave();
    } catch (error) {
      console.error("Error saving:", error);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-900/60 backdrop-blur-md rounded-lg border border-gray-700/50">
      {hasUnsavedChanges && !isSaving && (
        <div className="flex items-center gap-2 text-amber-400 text-sm animate-fade-in">
          <AlertCircle className="h-4 w-4 animate-pulse" />
          <span className="font-minecraft">{t("unsavedChanges")}</span>
        </div>
      )}

      {!hasUnsavedChanges && !isSaving && (
        <div className="flex items-center gap-2 text-emerald-400 text-sm">
          <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
          <span className="font-minecraft">{t("allChangesSaved")}</span>
        </div>
      )}

      {isSaving && (
        <div className="flex items-center gap-2 text-blue-400 text-sm">
          <Save className="h-4 w-4 animate-spin" />
          <span className="font-minecraft">{t("saving")}...</span>
        </div>
      )}
      
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
  );
};
