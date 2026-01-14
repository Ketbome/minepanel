"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Trash2, Settings as SettingsIcon } from "lucide-react";
import { fetchServerList, createServer, getAllServersStatus, deleteServer } from "@/services/docker/fetchs";
import { mcToast } from "@/lib/utils/minecraft-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Link from "next/link";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { getStatusBadgeClass, getStatusColor, getStatusIcon } from "@/lib/utils/server-status";
import { useServersStore } from "@/lib/store";

type ServerInfo = {
  id: string;
  name: string;
  description: string;
  displayName: string;
  status: "running" | "stopped" | "starting" | "not_found" | "loading";
  port: string;
  containerName: string;
};

export default function Dashboard() {
  const { t } = useLanguage();
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingServer, setIsCreatingServer] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeletingServer, setIsDeletingServer] = useState<string | null>(null);

  const form = useForm<{ id: string }>({
    defaultValues: {
      id: "",
    },
  });

  useEffect(() => {
    let isMounted = true;

    const initializeDashboard = async () => {
      if (isMounted) {
        await fetchServersFromBackend();
      }
    };

    initializeDashboard();

    const interval = setInterval(() => {
      if (isMounted) {
        loadServerInfo();
      }
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processServerStatuses = useCallback(
    async (serversList: ServerInfo[]): Promise<ServerInfo[]> => {
      if (serversList.length === 0) return [];

      try {
        const allStatusData: { [key: string]: "running" | "stopped" | "starting" | "not_found" } = await getAllServersStatus();
        const updatedServers = serversList.map((server) => {
          return {
            ...server,
            status: allStatusData[server.id] || "not_found",
          };
        });
        return updatedServers;
      } catch (error) {
        console.error("Error processing server statuses:", error);
        mcToast.error(t("errorProcessingStatuses"));
        return serversList.map((server) => ({ ...server, status: "not_found" }));
      }
    },
    [t]
  );

  const fetchServersFromBackend = useCallback(async () => {
    setIsLoading(true);
    try {
      const serverList = await fetchServerList();
      const formattedServers: ServerInfo[] = serverList.map((server) => ({
        id: server.id,
        name: server.serverName || `${t("serverDefaultName")} ${server.id}`,
        description: server.motd || t("minecraftServer"),
        displayName: server.serverName || `minecraft-${server.id}`,
        status: "loading",
        port: server.port || "25565",
        containerName: `${server.id}`,
      }));

      setServers(formattedServers);
      const updatedServers = await processServerStatuses(formattedServers);
      setServers(updatedServers);
    } catch (error) {
      console.error("Error fetching server list:", error);
      mcToast.error(t("errorLoadingServerList"));
    } finally {
      setIsLoading(false);
    }
  }, [t, processServerStatuses]);

  const refreshGlobalServers = useServersStore((state) => state.refreshAll);

  const handleDeleteServer = async (serverId: string) => {
    setIsDeletingServer(serverId);
    try {
      const response = await deleteServer(serverId);
      if (response.success) {
        mcToast.success(`${t("serverDeletedSuccess")} "${serverId}"`);
        await fetchServersFromBackend();
        refreshGlobalServers();
      } else {
        mcToast.error(`${t("errorDeletingServer")}: ${response.message}`);
      }
    } catch (error) {
      console.error("Error deleting server:", error);
      const err = error as { response?: { data?: { message?: string } } };
      mcToast.error(err.response?.data?.message || t("errorDeletingServer"));
    } finally {
      setIsDeletingServer(null);
    }
  };

  const loadServerInfo = useCallback(async () => {
    if (servers.length === 0) return;
    try {
      const updatedServers = await processServerStatuses(servers);
      setServers(updatedServers);
    } catch (error) {
      console.error("Error loading server information:", error);
      mcToast.error(t("errorLoadingServerInfo"));
    }
  }, [servers, t, processServerStatuses]);

  const handleCreateServer = async (values: { id: string }) => {
    setIsCreatingServer(true);
    try {
      const response = await createServer({ id: values.id });
      if (response.success) {
        mcToast.success(`${t("serverCreatedSuccess")} "${values.id}"`);
        setIsDialogOpen(false);
        form.reset();
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await fetchServersFromBackend();
        refreshGlobalServers();
      } else {
        mcToast.error(`${t("errorCreatingServer")}: ${response.message}`);
      }
    } catch (error) {
      console.error("Error creating server:", error);
      const err = error as { response?: { data?: { message?: string } } };
      mcToast.error(err.response?.data?.message || t("errorCreatingServer"));
    } finally {
      setIsCreatingServer(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "running":
        return t("active");
      case "starting":
        return t("starting2");
      case "stopped":
        return t("stopped2");
      case "not_found":
        return t("notFound");
      case "loading":
        return t("loading");
      default:
        return t("unknown");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold text-white font-minecraft flex items-center gap-3">
            <Image src="/images/command-block.webp" alt="Dashboard" width={40} height={40} />
            {t("dashboardTitle")}
          </h1>
          <p className="text-gray-400 mt-2">{t("dashboardDescription")}</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-minecraft">
              <Plus className="h-4 w-4 mr-2" />
              {t("createServer")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-gray-900 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle className="font-minecraft">{t("createNewServer")}</DialogTitle>
              <DialogDescription className="text-gray-400">{t("enterServerName")}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateServer)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-200">{t("serverIdLabel")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("serverIdPlaceholder")} {...field} className="bg-gray-800 border-gray-700 text-white" />
                      </FormControl>
                      <FormDescription className="text-gray-400">{t("serverIdDescription")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="gap-3 sm:gap-0">
                  <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)} className="bg-gray-700 hover:bg-gray-600">
                    {t("cancel")}
                  </Button>
                  <Button type="submit" disabled={isCreatingServer} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {isCreatingServer ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("creating")}
                      </>
                    ) : (
                      t("createServer")
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        {servers.length === 0 && !isLoading ? (
          <div className="text-center py-16 animate-fade-in">
            <Image src="/images/chest.webp" alt="Empty chest" width={80} height={80} className="mx-auto mb-6 opacity-60" />
            <h3 className="text-2xl font-minecraft text-gray-300 mb-4">{t("noServersAvailable")}</h3>
            <p className="text-gray-400 mb-8 text-lg">{t("noServersAvailableDesc")}</p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-minecraft text-lg px-8 py-3">
              <Plus className="h-5 w-5 mr-2" />
              {t("createFirstServer")}
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {servers.map((server: ServerInfo, index: number) => (
              <div key={server.id} className={`animate-fade-in-up stagger-${Math.min(index + 1, 6)}`}>
                <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-emerald-600/30 group">
                  <div className={`h-2 ${getStatusColor(server.status)}`}></div>

                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Image src={getStatusIcon(server.status)} alt="Server Status" width={48} height={48} className="object-contain" />
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-900 ${getStatusColor(server.status)}`} />
                        </div>
                        <div>
                          <CardTitle className="text-white font-minecraft text-lg group-hover:text-emerald-400 transition-colors">{server.id}</CardTitle>
                          <CardDescription className="text-gray-400 text-sm">{server.description}</CardDescription>
                        </div>
                      </div>

                      <Badge variant="outline" className={`px-3 py-1 ${getStatusBadgeClass(server.status)}`}>
                        {server.status === "loading" || server.status === "starting" ? (
                          <span className="flex items-center gap-1.5">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {getStatusText(server.status)}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-current"></div>
                            {getStatusText(server.status)}
                          </span>
                        )}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pb-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">{t("port")}</p>
                        <p className="text-white font-medium">{server.port}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">{t("container")}</p>
                        <p className="text-white font-medium truncate">{server.containerName}</p>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex gap-2 pt-0">
                    <Link href={`/dashboard/servers/${server.id}`} className="flex-1">
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 font-minecraft text-white">
                        <SettingsIcon className="h-4 w-4 mr-2" />
                        {t("configure")}
                      </Button>
                    </Link>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="icon" className="border-red-600/50 text-red-400 bg-blue-600/20">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-gray-900 border-gray-700 text-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-minecraft">{t("deleteServerTitle")}</AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-400">
                            {t("deleteServerWarning")} &quot;{server.id}&quot;?
                            <br />
                            {t("cannotBeUndone")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-gray-700 hover:bg-gray-600">{t("cancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => {
                              e.preventDefault();
                              handleDeleteServer(server.id);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={isDeletingServer === server.id}
                          >
                            {isDeletingServer === server.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {t("eliminating")}
                              </>
                            ) : (
                              t("delete")
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      {servers.length > 0 && (
        <div className="flex justify-center gap-8 pt-8">
          <div className="animate-float">
            <Image src="/images/anvil.webp" alt="Anvil" width={32} height={32} className="opacity-50 hover:opacity-80 transition-opacity" />
          </div>
          <div className="animate-float-delay-1">
            <Image src="/images/crafting-table.webp" alt="Crafting Table" width={32} height={32} className="opacity-50 hover:opacity-80 transition-opacity" />
          </div>
          <div className="animate-float-delay-2">
            <Image src="/images/command-block.webp" alt="Command Block" width={32} height={32} className="opacity-50 hover:opacity-80 transition-opacity" />
          </div>
        </div>
      )}
    </div>
  );
}
