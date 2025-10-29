import { FC, memo } from "react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { LogsError } from "../Tabs/LogsTab";

interface LogsLastUpdateProps {
  lastUpdate: Date | null;
  error: LogsError | null;
}

const LogsLastUpdate: FC<LogsLastUpdateProps> = ({ lastUpdate, error }) => {
  const { t } = useLanguage();
  if (!lastUpdate || !!error) return null;
  return (
    <CardContent className="pb-2">
      <div className="bg-green-900/20 border border-green-700/30 rounded-md p-2 mb-4">
        <div className="flex items-center text-xs text-green-300">
          <CheckCircle className="h-4 w-4 mr-2" />
          <span>
            {t("lastUpdate")} {lastUpdate?.toLocaleTimeString()}
          </span>
        </div>
      </div>
    </CardContent>
  );
}

export default memo(LogsLastUpdate);
