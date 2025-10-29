import { CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { FC, memo } from "react";
import { ResourcesData } from "../Tabs/LogsTab";
import { Cpu, RefreshCcw, Server } from "lucide-react";

interface LogsResourcesProps {
  readonly resources: ResourcesData | null;
  readonly loadingResources: boolean;
  readonly resourcesError: string | null;
}

const LogsResources: FC<LogsResourcesProps> = ({ resources, loadingResources, resourcesError }) => {
  const { t } = useLanguage();
  return (
    <CardContent className="pb-2">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className={`bg-gray-800/70 rounded-md p-3 border flex items-center ${resourcesError ? "border-red-700/50" : "border-gray-700/50"}`}>
          <div className={`p-2 rounded-md mr-3 ${resourcesError ? "bg-red-500/20" : "bg-blue-500/20"}`}>
            <Cpu className={`h-5 w-5 ${resourcesError ? "text-red-400" : "text-blue-400"}`} />
          </div>
          <div>
            <p className="text-xs text-gray-400">{t("cpu")}</p>
            {(() => {
              let cpuContent;
              if (loadingResources) {
                cpuContent = <RefreshCcw className="h-3 w-3 animate-spin inline mr-1" />;
              } else if (resourcesError) {
                cpuContent = <span className="text-red-400">{t("error")}</span>;
              } else if (resources?.status !== "running" && resources?.cpuUsage === "N/A") {
                cpuContent = t("serverInactive");
              } else {
                cpuContent = resources?.cpuUsage || "N/A";
              }
              return <p className="text-sm font-medium text-white">{cpuContent}</p>;
            })()}
          </div>
        </div>
        <div className={`bg-gray-800/70 rounded-md p-3 border flex items-center ${resourcesError ? "border-red-700/50" : "border-gray-700/50"}`}>
          <div className={`p-2 rounded-md mr-3 ${resourcesError ? "bg-red-500/20" : "bg-purple-500/20"}`}>
            <Server className={`h-5 w-5 ${resourcesError ? "text-red-400" : "text-purple-400"}`} />
          </div>
          <div>
            <p className="text-xs text-gray-400">{t("memory")}</p>
            {(() => {
              let memoryContent;
              if (loadingResources) {
                memoryContent = <RefreshCcw className="h-3 w-3 animate-spin inline mr-1" />;
              } else if (resourcesError) {
                memoryContent = <span className="text-red-400">{t("error")}</span>;
              } else if (resources?.status !== "running" && resources?.memoryUsage === "N/A") {
                memoryContent = t("serverInactive");
              } else {
                memoryContent = `${resources?.memoryUsage || "N/A"} / ${resources?.memoryLimit || "N/A"}`;
              }
              return <p className="text-sm font-medium text-white">{memoryContent}</p>;
            })()}
          </div>
        </div>
      </div>
    </CardContent>
  );
}

export default memo(LogsResources);
