"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Trash2, Settings as SettingsIcon, Gamepad2 } from "lucide-react";
import {
  fetchHytaleServerList,
  createHytaleServer,
  getAllHytaleServersStatus,
  deleteHytaleServer,
} from "@/services/hytale/fetchs";
import { mcToast } from "@/lib/utils/minecraft-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { getStatusBadgeClass, getStatusColor, getStatusIcon } from "@/lib/utils/server-status";
import { HytaleServerStatus } from "@/lib/types/hytale";

type HytaleServerInfo = {
  id: string;
  name: string;
  status: HytaleServerStatus;
  port: string;
};

export default function HytaleDashboard() {
  const { t } = useLanguage();
  const [servers, setServers] = useState<HytaleServerInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingServer, setIsCreatingServer] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeletingServer, setIsDeletingServer] = useState<string | null>(null);

  const form = useForm<{ id: string; serverName: string; port: string }>({
    defaultValues: {
      id: "",
      serverName: "",
      port: "5520",
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
    async (serversList: HytaleServerInfo[]): Promise<HytaleServerInfo[]> => {
      if (serversList.length === 0) return [];

      try {
        const allStatusData = await getAllHytaleServersStatus();
        return serversList.map((server) => ({
          ...server,
          status: allStatusData[server.id] || "not_found",
        }));
      } catch (error) {
        console.error("Error processing server statuses:", error);
        return serversList.map((server) => ({ ...server, status: "not_found" as HytaleServerStatus }));
      }
    },
    []
  );

  const fetchServersFromBackend = useCallback(async () => {
    setIsLoading(true);
    try {
      const serverList = await fetchHytaleServerList();
      const formattedServers: HytaleServerInfo[] = serverList.map((server) => ({
        id: server.id,
        name: server.serverName || server.id,
        status: "loading" as HytaleServerStatus,
        port: server.port || "5520",
      }));

      setServers(formattedServers);
      const updatedServers = await processServerStatuses(formattedServers);
      setServers(updatedServers);
    } catch (error) {
      console.error("Error fetching Hytale server list:", error);
      mcToast.error(t("errorLoadingServerList"));
    } finally {
      setIsLoading(false);
    }
  }, [t, processServerStatuses]);

  const handleDeleteServer = async (serverId: string) => {
    setIsDeletingServer(serverId);
    try {
      const response = await deleteHytaleServer(serverId);
      if (response.success) {
        mcToast.success(`${t("serverDeletedSuccess")} "${serverId}"`);
        await fetchServersFromBackend();
      } else {
        mcToast.error(t("errorDeletingServer"));
      }
    } catch (error) {
      console.error("Error deleting server:", error);
      mcToast.error(t("errorDeletingServer"));
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
    }
  }, [servers, processServerStatuses]);

  const handleCreateServer = async (values: { id: string; serverName: string; port: string }) => {
    setIsCreatingServer(true);
    try {
      await createHytaleServer({
        id: values.id,
        serverName: values.serverName || values.id,
        port: values.port || "5520",
      });
      mcToast.success(`${t("serverCreatedSuccess")} "${values.id}"`);
      setIsDialogOpen(false);
      form.reset();
      await fetchServersFromBackend();
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
            <Gamepad2 className="h-8 w-8 text-purple-400" />
            {t("hytaleServers")}
          </h1>
          <p className="text-gray-400 mt-2">{t("hytaleServersDescription")}</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2 px-4 shadow-lg shadow-purple-600/20 transition-all duration-300 hover:shadow-purple-600/40">
              <Plus className="h-4 w-4" />
              {t("newHytaleServer")}
            </Button>
          </DialogTrigger>

          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-purple-400" />
                {t("createHytaleServer")}
              </DialogTitle>
              <DialogDescription className="text-gray-400">{t("createHytaleServerDescription")}</DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateServer)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="id"
                  rules={{
                    required: t("serverIdRequired"),
                    pattern: {
                      value: /^[a-zA-Z0-9_-]+$/,
                      message: t("serverIdPattern"),
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("serverId")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="my-hytale-server"
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </FormControl>
                      <FormDescription className="text-gray-500">{t("serverIdDescription")}</FormDescription>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serverName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("serverName")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="My Hytale Server"
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("port")} (UDP)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="5520" className="bg-gray-800 border-gray-600 text-white" />
                      </FormControl>
                      <FormDescription className="text-gray-500">{t("hytalePortDescription")}</FormDescription>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit" disabled={isCreatingServer} className="bg-purple-600 hover:bg-purple-700">
                    {isCreatingServer ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {t("creating")}
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        {t("createServer")}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto" />
            <p className="text-gray-400">{t("loadingServers")}</p>
          </div>
        </div>
      ) : servers.length === 0 ? (
        <Card className="bg-gray-900/60 border-gray-700/40 backdrop-blur-md animate-fade-in-up">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Gamepad2 className="h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">{t("noHytaleServers")}</h3>
            <p className="text-gray-400 mb-6 max-w-md">{t("noHytaleServersDescription")}</p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
            >
              <Plus className="h-4 w-4" />
              {t("createFirstHytaleServer")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servers.map((server, index) => (
            <Card
              key={server.id}
              className="bg-gray-900/60 border-gray-700/40 backdrop-blur-md hover:border-purple-500/50 transition-all duration-300 animate-fade-in-up group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Gamepad2 className="h-5 w-5 text-purple-400" />
                    {server.name}
                  </CardTitle>
                  <Badge className={getStatusBadgeClass(server.status)}>
                    {server.status === "loading" ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      getStatusIcon(server.status)
                    )}
                    {getStatusText(server.status)}
                  </Badge>
                </div>
                <CardDescription className="text-gray-400">
                  {t("port")}: {server.port}/UDP
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-3">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(server.status)}`} />
                  <span>ID: {server.id}</span>
                </div>
              </CardContent>

              <CardFooter className="flex gap-2 pt-3 border-t border-gray-700/40">
                <Link href={`/dashboard/hytale/${server.id}`} className="flex-1">
                  <Button
                    variant="outline"
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white gap-2"
                  >
                    <SettingsIcon className="h-4 w-4" />
                    {t("manage")}
                  </Button>
                </Link>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-red-900/50 text-red-400 hover:bg-red-900/20 hover:text-red-300"
                      disabled={isDeletingServer === server.id}
                    >
                      {isDeletingServer === server.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-gray-900 border-gray-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">{t("deleteServer")}</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-400">
                        {t("deleteServerConfirmation")} &quot;{server.name}&quot;?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700">
                        {t("cancel")}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteServer(server.id)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {t("delete")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
