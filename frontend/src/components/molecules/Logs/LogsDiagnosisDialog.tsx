import { FC, useState } from "react";
import { Stethoscope, RefreshCcw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { TranslationKey } from "@/lib/translations";
import { mcToast } from "@/lib/utils/minecraft-toast";
import { DiagnosisProblemKind, getServerDiagnosis, ServerDiagnosis } from "@/services/docker/fetchs";

const PROBLEM_TEXT: Record<DiagnosisProblemKind, { title: TranslationKey; fix: TranslationKey }> = {
  client_only_mod: { title: "diagnosisClientOnlyMod", fix: "diagnosisClientOnlyModFix" },
  missing_dependency: { title: "diagnosisMissingDependency", fix: "diagnosisMissingDependencyFix" },
  mixin_failure: { title: "diagnosisMixinFailure", fix: "diagnosisMixinFailureFix" },
  duplicate_mod: { title: "diagnosisDuplicateMod", fix: "diagnosisDuplicateModFix" },
  java_version: { title: "diagnosisJavaVersion", fix: "diagnosisJavaVersionFix" },
  out_of_memory: { title: "diagnosisOutOfMemory", fix: "diagnosisOutOfMemoryFix" },
  port_in_use: { title: "diagnosisPortInUse", fix: "diagnosisPortInUseFix" },
};

export const LogsDiagnosisDialog: FC<{ serverId: string }> = ({ serverId }) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState<ServerDiagnosis | null>(null);

  const run = async () => {
    setOpen(true);
    setLoading(true);
    try {
      setDiagnosis(await getServerDiagnosis(serverId));
    } catch {
      setDiagnosis(null);
      mcToast.error(t("diagnosisFailed"));
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={run} disabled={loading} className="bg-gray-800/70 text-gray-200 border-gray-700/50 hover:bg-gray-700/50">
        <Stethoscope className="h-4 w-4 mr-1" />
        {t("diagnose")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("diagnosisTitle")}</DialogTitle>
            <DialogDescription>{t("diagnosisDescription")}</DialogDescription>
          </DialogHeader>
          {loading || !diagnosis ? (
            <div className="flex items-center gap-2 py-6 text-sm text-gray-400">
              <RefreshCcw className="h-4 w-4 animate-spin" />
              {t("diagnosisRunning")}
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              {diagnosis.problems.length === 0 ? (
                <p className="flex items-start gap-2 text-gray-300">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  {t("diagnosisNoProblems")}
                </p>
              ) : (
                diagnosis.problems.map((problem) => (
                  <div key={problem.kind} className="rounded-md border border-amber-500/40 bg-amber-950/20 p-3">
                    <h4 className="font-semibold text-amber-300">{t(PROBLEM_TEXT[problem.kind].title)}</h4>
                    <p className="mt-1 text-gray-300">{t(PROBLEM_TEXT[problem.kind].fix)}</p>
                    {problem.mods.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <span className="text-xs text-gray-400">{t("diagnosisMods")}:</span>
                        {problem.mods.map((mod) => (
                          <code key={mod} className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-100">{mod}</code>
                        ))}
                      </div>
                    )}
                    <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-gray-950/80 p-2 text-xs text-gray-400 [overflow-wrap:anywhere]">{problem.evidence}</pre>
                  </div>
                ))
              )}
              {diagnosis.errorLines.length > 0 && (
                <details className="rounded-md border border-gray-700/50 p-3">
                  <summary className="cursor-pointer text-gray-300">{t("diagnosisErrorLines")} ({diagnosis.errorLines.length})</summary>
                  <pre className="mt-2 max-h-60 overflow-y-auto whitespace-pre-wrap break-words text-xs text-red-300 [overflow-wrap:anywhere]">{diagnosis.errorLines.join("\n")}</pre>
                </details>
              )}
              {diagnosis.crashReport && (
                <details className="rounded-md border border-gray-700/50 p-3">
                  <summary className="cursor-pointer text-gray-300">{t("diagnosisCrashReport")}: {diagnosis.crashReport.file}</summary>
                  <pre className="mt-2 max-h-60 overflow-y-auto whitespace-pre-wrap break-words text-xs text-gray-400 [overflow-wrap:anywhere]">{diagnosis.crashReport.excerpt}</pre>
                </details>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
