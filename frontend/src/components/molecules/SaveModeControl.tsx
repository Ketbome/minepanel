import { FC } from "react";
import { Button } from "@/components/ui/button";
import { Save, Zap } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { motion } from "framer-motion";
import Image from "next/image";

interface SaveModeControlProps {
  autoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
  onManualSave: () => Promise<boolean>;
  isSaving: boolean;
}

export const SaveModeControl: FC<SaveModeControlProps> = ({ autoSaveEnabled, setAutoSaveEnabled, onManualSave, isSaving }) => {
  const { t } = useLanguage();

  return (
    <div className="flex items-center gap-3 p-4 bg-gray-900/60 backdrop-blur-md rounded-lg border border-gray-700/40">
      <div className="flex items-center gap-2">
        <Image src="/images/diamond.webp" alt="Save Mode" width={18} height={18} className="opacity-90" />
        <span className="text-sm font-minecraft text-gray-300">{t("saveMode")}:</span>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant={autoSaveEnabled ? "default" : "outline"} size="sm" onClick={() => setAutoSaveEnabled(true)} disabled={isSaving} className={`relative font-minecraft transition-all ${autoSaveEnabled ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500" : "bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 border-gray-700"}`}>
          <Zap className="h-4 w-4 mr-1.5" />
          {t("autoSave")}
          {autoSaveEnabled && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full">
              <motion.div animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-full h-full bg-emerald-400 rounded-full" />
            </motion.div>
          )}
        </Button>

        <Button type="button" variant={!autoSaveEnabled ? "default" : "outline"} size="sm" onClick={() => setAutoSaveEnabled(false)} disabled={isSaving} className={`font-minecraft transition-all ${!autoSaveEnabled ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-500" : "bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 border-gray-700"}`}>
          <Save className="h-4 w-4 mr-1.5" />
          {t("manualSave")}
        </Button>
      </div>

      {!autoSaveEnabled && (
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
          <Button type="button" onClick={onManualSave} disabled={isSaving} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-minecraft gap-2">
            {isSaving ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Save className="h-4 w-4" />
                </motion.div>
                {t("saving")}...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {t("saveNow")}
              </>
            )}
          </Button>
        </motion.div>
      )}

      {autoSaveEnabled && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 ml-2 text-xs text-gray-400">
          {isSaving ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <Zap className="h-3 w-3 text-emerald-400" />
              </motion.div>
              <span>{t("saving")}...</span>
            </>
          ) : (
            <>
              <Zap className="h-3 w-3 text-emerald-400" />
              <span>{t("autoSaveActive")}</span>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
};
