import { FC, memo } from "react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { CardContent } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import { LogsError } from "../Tabs/LogsTab";

interface LogsErrorAlertProps {
  error: LogsError | null;
  resourcesError: string | null;
}

const LogsErrorAlert: FC<LogsErrorAlertProps> = ({ error, resourcesError }) => {
  const { t } = useLanguage();
  if (!error && !resourcesError) return null;
  return (
    <CardContent className="pb-2">
      <div className="bg-red-900/40 border border-red-700/50 rounded-md p-3 mb-4">
        <div className="flex items-center">
          <XCircle className="h-5 w-5 text-red-400 mr-2" />
          <div>
            <p className="text-sm font-medium text-red-200">{error ? t("logsError") : t("resourcesError")}</p>
            <p className="text-xs text-red-300 mt-1">{error ? error.message : resourcesError}</p>
          </div>
        </div>
      </div>
    </CardContent>
  );
};

export default memo(LogsErrorAlert);
