import { memo } from "react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { LogsError } from "../Tabs/LogsTab";

interface LogsStatusAlertProps {
  hasErrors: boolean;
  error: LogsError | null;
}

export const LogsStatusAlert = memo<LogsStatusAlertProps>(({ hasErrors, error }) => {
  const { t } = useLanguage();
  if (!hasErrors || error) return null;
  return (
    <CardContent className="pb-2">
      <div className="bg-yellow-900/40 border border-yellow-700/50 rounded-md p-3 mb-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
          <div>
            <p className="text-sm font-medium text-yellow-200">{t("errorsDetected")}</p>
            <p className="text-xs text-yellow-300 mt-1">{t("errorsDetectedDesc")}</p>
          </div>
        </div>
      </div>
    </CardContent>
  );
});
