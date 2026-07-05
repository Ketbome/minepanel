import { FC, useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Play, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { mcToast } from "@/lib/utils/minecraft-toast";
import { createScheduledTask, deleteScheduledTask, getScheduledTasks, runScheduledTask, ScheduledTask, ScheduledTaskType, ScheduleKind, updateScheduledTask } from "@/services/scheduler/scheduler.service";

interface ScheduledTasksTabProps {
  serverId: string;
}

interface TaskForm {
  name: string;
  type: ScheduledTaskType;
  command: string;
  scheduleKind: ScheduleKind;
  intervalMinutes: string;
  cronExpression: string;
  enabled: boolean;
}

const emptyForm: TaskForm = {
  name: "",
  type: "restart",
  command: "",
  scheduleKind: "interval",
  intervalMinutes: "60",
  cronExpression: "",
  enabled: true,
};

const formatDate = (value: string | null): string => {
  if (!value) return "—";
  return new Date(value).toLocaleString();
};

export const ScheduledTasksTab: FC<ScheduledTasksTabProps> = ({ serverId }) => {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TaskForm>(emptyForm);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      setTasks(await getScheduledTasks(serverId));
    } catch {
      mcToast.error(t("tasksLoadError"));
    } finally {
      setLoading(false);
    }
  }, [serverId, t]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const resetForm = () => setForm(emptyForm);

  const handleCreate = async () => {
    const interval = Number.parseInt(form.intervalMinutes, 10);
    if (!form.name.trim()) {
      mcToast.error(t("tasksNameRequired"));
      return;
    }
    if (form.scheduleKind === "interval" && (!Number.isFinite(interval) || interval < 1)) {
      mcToast.error(t("tasksIntervalInvalid"));
      return;
    }
    if (form.scheduleKind === "cron" && !form.cronExpression.trim()) {
      mcToast.error(t("tasksCronRequired"));
      return;
    }
    if (form.type === "command" && !form.command.trim()) {
      mcToast.error(t("tasksCommandRequired"));
      return;
    }

    setSaving(true);
    try {
      await createScheduledTask(serverId, {
        name: form.name.trim(),
        type: form.type,
        command: form.type === "command" ? form.command.trim() : undefined,
        scheduleKind: form.scheduleKind,
        intervalMinutes: form.scheduleKind === "interval" ? interval : undefined,
        cronExpression: form.scheduleKind === "cron" ? form.cronExpression.trim() : undefined,
        enabled: form.enabled,
      });
      mcToast.success(t("tasksCreated"));
      resetForm();
      await fetchTasks();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string | string[] } } };
      const message = err.response?.data?.message;
      mcToast.error(Array.isArray(message) ? message[0] : message || t("tasksSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (task: ScheduledTask) => {
    try {
      await updateScheduledTask(serverId, task.id, { enabled: !task.enabled });
      await fetchTasks();
    } catch {
      mcToast.error(t("tasksSaveError"));
    }
  };

  const handleRun = async (task: ScheduledTask) => {
    try {
      await runScheduledTask(serverId, task.id);
      mcToast.success(t("tasksRunQueued"));
      await fetchTasks();
    } catch {
      mcToast.error(t("tasksRunError"));
    }
  };

  const handleDelete = async (task: ScheduledTask) => {
    try {
      await deleteScheduledTask(serverId, task.id);
      mcToast.success(t("tasksDeleted"));
      await fetchTasks();
    } catch {
      mcToast.error(t("tasksDeleteError"));
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gray-900/60 border-gray-700/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-minecraft text-emerald-400">
            <Clock className="h-5 w-5" />
            {t("tasksTitle")}
          </CardTitle>
          <CardDescription className="text-gray-400">{t("tasksDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="task-name" className="text-gray-300">
                {t("tasksName")}
              </Label>
              <Input id="task-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={t("tasksNamePlaceholder")} className="bg-gray-800 border-gray-700 text-white" />
            </div>

            <div className="space-y-1">
              <Label className="text-gray-300">{t("tasksType")}</Label>
              <Select value={form.type} onValueChange={(value: ScheduledTaskType) => setForm({ ...form, type: value })}>
                <SelectTrigger className="bg-gray-800/70 border-gray-700/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="restart" className="text-white hover:bg-gray-700">
                    {t("tasksTypeRestart")}
                  </SelectItem>
                  <SelectItem value="command" className="text-white hover:bg-gray-700">
                    {t("tasksTypeCommand")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.type === "command" && (
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="task-command" className="text-gray-300">
                  {t("tasksCommand")}
                </Label>
                <Input id="task-command" value={form.command} onChange={(event) => setForm({ ...form, command: event.target.value })} placeholder="say Restarting soon" className="bg-gray-800 border-gray-700 text-white" />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-gray-300">{t("tasksScheduleKind")}</Label>
              <Select value={form.scheduleKind} onValueChange={(value: ScheduleKind) => setForm({ ...form, scheduleKind: value })}>
                <SelectTrigger className="bg-gray-800/70 border-gray-700/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="interval" className="text-white hover:bg-gray-700">
                    {t("tasksScheduleInterval")}
                  </SelectItem>
                  <SelectItem value="cron" className="text-white hover:bg-gray-700">
                    {t("tasksScheduleCron")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.scheduleKind === "interval" && (
              <div className="space-y-1">
                <Label htmlFor="task-interval" className="text-gray-300">
                  {t("tasksInterval")}
                </Label>
                <Input id="task-interval" type="number" min={1} value={form.intervalMinutes} onChange={(event) => setForm({ ...form, intervalMinutes: event.target.value })} className="bg-gray-800 border-gray-700 text-white" />
              </div>
            )}

            {form.scheduleKind === "cron" && (
              <div className="space-y-1">
                <Label htmlFor="task-cron" className="text-gray-300">
                  {t("tasksCron")}
                </Label>
                <Input id="task-cron" value={form.cronExpression} onChange={(event) => setForm({ ...form, cronExpression: event.target.value })} placeholder="0 4 * * *" className="bg-gray-800 border-gray-700 text-white font-mono" />
                <p className="text-xs text-gray-500">{t("tasksCronHelp")}</p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-6">
              <Switch id="task-enabled" checked={form.enabled} onCheckedChange={(checked) => setForm({ ...form, enabled: checked })} />
              <Label htmlFor="task-enabled" className="text-gray-300">
                {t("tasksEnabled")}
              </Label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" onClick={handleCreate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/40">
              <Plus className="h-4 w-4 mr-1" />
              {t("tasksAdd")}
            </Button>
            <Button type="button" variant="outline" className="bg-gray-800/60 border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white" onClick={resetForm}>
              <X className="h-4 w-4 mr-1" />
              {t("tasksClear")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900/60 border-gray-700/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-minecraft text-gray-200 text-base">{t("tasksScheduled")}</CardTitle>
            <Button type="button" size="sm" variant="outline" className="bg-gray-800/60 border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white" onClick={fetchTasks} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">{t("tasksEmpty")}</p>}

          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="flex flex-col gap-2 rounded-lg border border-gray-700/60 bg-gray-800/40 p-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-minecraft text-gray-100">{task.name}</span>
                    <Badge variant="outline" className="border-emerald-700 text-emerald-300">
                      {task.type === "restart" ? t("tasksTypeRestart") : t("tasksTypeCommand")}
                    </Badge>
                    {!task.enabled && (
                      <Badge variant="outline" className="border-gray-600 text-gray-400">
                        {t("tasksPaused")}
                      </Badge>
                    )}
                  </div>
                  {task.type === "command" && task.command && <p className="text-xs text-gray-400 font-mono">{task.command}</p>}
                  <p className="text-xs text-gray-500">
                    {task.scheduleKind === "cron" && task.cronExpression ? (
                      <span className="font-mono">{task.cronExpression}</span>
                    ) : (
                      <>
                        {t("tasksEvery")} {task.intervalMinutes} {t("tasksMinutes")}
                      </>
                    )}{" "}
                    · {t("tasksNextRun")}: {formatDate(task.nextRunAt)}
                  </p>
                  {task.lastResult && (
                    <p className="text-xs text-gray-500">
                      {t("tasksLastResult")}: {task.lastResult}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={task.enabled} onCheckedChange={() => handleToggle(task)} />
                  <Button type="button" size="sm" variant="outline" className="bg-gray-800/60 border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white" onClick={() => handleRun(task)}>
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="bg-gray-800/60 border-red-800 text-red-300 hover:bg-red-900/40 hover:text-red-200" onClick={() => handleDelete(task)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
