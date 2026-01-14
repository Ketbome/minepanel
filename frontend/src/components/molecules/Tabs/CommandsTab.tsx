import { FC, useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Send, Trash, Terminal, AlertTriangle, Users, Shield, Ban, RefreshCw, UserPlus, UserMinus, Crown, Gavel, MoreVertical, Gamepad2, MapPin, Heart, Diamond, MessageSquare, Save, ShieldCheck, ShieldOff, Sun, Moon, CloudRain } from "lucide-react";
import { useServerCommands } from "@/lib/hooks/useServerCommands";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { getOnlinePlayers, getWhitelist, getOps, getBannedPlayers, executeServerCommand, WhitelistPlayer, OpPlayer, BannedPlayer } from "@/services/docker/fetchs";
import { mcToast } from "@/lib/utils/minecraft-toast";
import Image from "next/image";

interface CommandsTabProps {
  serverId: string;
  serverStatus: string;
  rconPort: string;
  rconPassword: string;
}

export const CommandsTab: FC<CommandsTabProps> = ({ serverId, serverStatus, rconPort, rconPassword }) => {
  const { t } = useLanguage();
  const { command, response, executing, executeCommand, setCommand, clearResponse } = useServerCommands(serverId, rconPort, rconPassword);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<Array<{ label: string; command: string }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Player management state
  const [onlinePlayers, setOnlinePlayers] = useState<{ online: number; max: number; players: string[] }>({ online: 0, max: 0, players: [] });
  const [whitelist, setWhitelist] = useState<WhitelistPlayer[]>([]);
  const [ops, setOps] = useState<OpPlayer[]>([]);
  const [banned, setBanned] = useState<BannedPlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [activeSection, setActiveSection] = useState<"commands" | "players">("commands");

  const isServerRunning = serverStatus === "running";

  const fetchPlayerData = useCallback(async () => {
    if (!isServerRunning) return;
    setLoadingPlayers(true);
    try {
      const [online, wl, opsList, bannedList] = await Promise.all([getOnlinePlayers(serverId, rconPort, rconPassword), getWhitelist(serverId), getOps(serverId), getBannedPlayers(serverId)]);
      setOnlinePlayers(online);
      setWhitelist(wl);
      setOps(opsList);
      setBanned(bannedList);
    } catch (error) {
      console.error("Error fetching player data:", error);
    } finally {
      setLoadingPlayers(false);
    }
  }, [serverId, rconPort, rconPassword, isServerRunning]);

  useEffect(() => {
    if (isServerRunning && activeSection === "players") {
      fetchPlayerData();
    }
  }, [isServerRunning, activeSection, fetchPlayerData]);

  // Helper para ejecutar comandos RCON y refrescar data
  const runCommand = async (cmd: string, successMsg: string) => {
    const result = await executeServerCommand(serverId, { command: cmd, rconPort, rconPassword });
    if (result.success) {
      mcToast.success(successMsg);
      setTimeout(fetchPlayerData, 500); // Pequeño delay para que el servidor procese
    } else {
      mcToast.error(result.output);
    }
    return result;
  };

  const [broadcastMsg, setBroadcastMsg] = useState("");

  // Player management actions
  const handleAddWhitelist = () => newPlayerName.trim() && runCommand(`whitelist add ${newPlayerName.trim()}`, t("playerAddedToWhitelist")).then(() => setNewPlayerName(""));
  const handleRemoveWhitelist = (name: string) => runCommand(`whitelist remove ${name}`, t("playerRemovedFromWhitelist"));
  const handleAddOp = (name: string) => runCommand(`op ${name}`, t("playerPromotedToOp"));
  const handleRemoveOp = (name: string) => runCommand(`deop ${name}`, t("playerDemotedFromOp"));
  const handleKick = (name: string) => runCommand(`kick ${name}`, t("playerKicked"));
  const handleBan = (name: string) => runCommand(`ban ${name}`, t("playerBanned"));
  const handleUnban = (name: string) => runCommand(`pardon ${name}`, t("playerUnbanned"));

  // Player quick actions
  const handleGamemode = (name: string, mode: string) => runCommand(`gamemode ${mode} ${name}`, t("gamemodeChanged"));
  const handleTpToSpawn = (name: string) => runCommand(`tp ${name} 0 100 0`, t("playerTeleported"));
  const handleHeal = (name: string) => runCommand(`effect give ${name} minecraft:instant_health 1 10`, t("playerHealed"));
  const handleGiveItems = (name: string, item: string, amount: number) => runCommand(`give ${name} minecraft:${item} ${amount}`, t("itemsGiven"));

  // Server quick actions
  const handleSaveWorld = () => runCommand("save-all", t("worldSaved"));
  const handleWhitelistToggle = (enable: boolean) => runCommand(`whitelist ${enable ? "on" : "off"}`, enable ? t("whitelistEnabled") : t("whitelistDisabled"));
  const handleBroadcast = () => broadcastMsg.trim() && runCommand(`say ${broadcastMsg}`, t("messageBroadcast")).then(() => setBroadcastMsg(""));
  const handleSetTime = (time: string) => runCommand(`time set ${time}`, t("timeChanged"));
  const handleSetWeather = (weather: string) => runCommand(`weather ${weather}`, t("weatherChanged"));

  const allCommands = useMemo(
    () => [
      { label: t("cmdListPlayers"), command: "list", category: "players" },
      { label: t("cmdTeleportPlayer"), command: "tp @p ~ ~ ~", category: "players" },
      { label: t("cmdGiveXP"), command: "xp add @p 100 levels", category: "players" },
      { label: t("cmdGiveEffect"), command: "effect give @p minecraft:speed 60 2", category: "players" },
      { label: t("cmdCreativeMode"), command: "gamemode creative @p", category: "players" },
      { label: t("cmdSurvivalMode"), command: "gamemode survival @p", category: "players" },
      { label: t("cmdAdventureMode"), command: "gamemode adventure @p", category: "players" },
      { label: t("cmdSpectatorMode"), command: "gamemode spectator @p", category: "players" },
      { label: t("cmdDayTime"), command: "time set day", category: "world" },
      { label: t("cmdNightTime"), command: "time set night", category: "world" },
      { label: t("cmdClearWeather"), command: "weather clear", category: "world" },
      { label: t("cmdRainWeather"), command: "weather rain", category: "world" },
      { label: t("cmdThunderWeather"), command: "weather thunder", category: "world" },
      { label: t("cmdPeacefulDifficulty"), command: "difficulty peaceful", category: "world" },
      { label: t("cmdEasyDifficulty"), command: "difficulty easy", category: "world" },
      { label: t("cmdNormalDifficulty"), command: "difficulty normal", category: "world" },
      { label: t("cmdHardDifficulty"), command: "difficulty hard", category: "world" },
      { label: t("cmdGiveDiamonds"), command: "give @p minecraft:diamond 64", category: "items" },
      { label: t("cmdGiveDiamondSword"), command: "give @p minecraft:diamond_sword", category: "items" },
      { label: t("cmdGiveGoldenApples"), command: "give @p minecraft:golden_apple 16", category: "items" },
      { label: t("cmdGiveCommandBlock"), command: "give @p minecraft:command_block", category: "items" },
      { label: t("cmdSeedWorld"), command: "seed", category: "admin" },
      { label: t("cmdSaveWorld"), command: "save-all", category: "admin" },
      { label: t("cmdKickPlayer"), command: "kick <jugador>", category: "admin" },
      { label: t("cmdBanPlayer"), command: "ban <jugador>", category: "admin" },
      { label: t("cmdViewTPS"), command: "forge tps", category: "admin" },
      { label: t("cmdSpigotTimings"), command: "timings on", category: "admin" },
    ],
    [t]
  );

  const commonCommands = allCommands.slice(0, 7);

  useEffect(() => {
    if (command) {
      const filtered = allCommands.filter((cmd) => cmd.command.toLowerCase().includes(command.toLowerCase()) || cmd.label.toLowerCase().includes(command.toLowerCase()));
      setFilteredCommands(filtered.slice(0, 5));
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [command, allCommands]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      executeCommand();
      setShowSuggestions(false);
    } else if (e.key === "Tab" && showSuggestions && filteredCommands.length > 0) {
      e.preventDefault();
      setCommand(filteredCommands[0].command);
      setShowSuggestions(false);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    } else if (e.key === "ArrowDown" && showSuggestions) {
      e.preventDefault();
    }
  };

  const handleSuggestionClick = (suggestedCommand: string) => {
    setCommand(suggestedCommand);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
          <Image src="/images/command-block.webp" alt="Comandos" width={24} height={24} className="opacity-90" />
          {t("commandConsole")}
        </CardTitle>
        <CardDescription className="text-gray-300">{t("commandConsoleDesc")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isServerRunning && (
          <div className="p-4 border rounded-md bg-amber-900/30 border-amber-700/30 text-amber-300 mb-4 flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium font-minecraft text-sm">{t("serverNotRunning2")}</p>
              <p className="text-xs text-amber-200/80 mt-1">{t("startServerToExecute")}</p>
            </div>
          </div>
        )}

        {/* Toggle entre Commands y Players */}
        <div className="flex gap-2 border-b border-gray-700/50 pb-2">
          <Button type="button" variant={activeSection === "commands" ? "default" : "ghost"} size="sm" onClick={() => setActiveSection("commands")} className={activeSection === "commands" ? "bg-emerald-600 hover:bg-emerald-700" : "text-gray-400 hover:text-white"}>
            <Terminal className="h-4 w-4 mr-1" />
            {t("commands")}
          </Button>
          <Button type="button" variant={activeSection === "players" ? "default" : "ghost"} size="sm" onClick={() => setActiveSection("players")} disabled={!isServerRunning} className={activeSection === "players" ? "bg-emerald-600 hover:bg-emerald-700" : "text-gray-400 hover:text-white"}>
            <Users className="h-4 w-4 mr-1" />
            {t("players")}
          </Button>
        </div>

        {activeSection === "commands" && (
          <>
            <div className="space-y-2">
              <div className="text-gray-300 font-minecraft text-sm mb-1 flex items-center gap-2">
                <Image src="/images/experience-bottle.webp" alt="Comandos" width={16} height={16} className="opacity-90" />
                {t("quickCommands")}
              </div>
              <div className="flex flex-wrap gap-2">
                {commonCommands.map((cmd, idx) => (
                  <Button key={idx} type="button" variant="outline" size="sm" onClick={() => setCommand(cmd.command)} disabled={!isServerRunning} className="text-xs bg-gray-800/60 border-gray-700/50 text-gray-200 hover:bg-gray-700/40 hover:text-emerald-400 font-minecraft">
                    {cmd.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-gray-300 font-minecraft text-sm mb-1 flex items-center gap-2">
                <Image src="/images/book.webp" alt="Comandos" width={16} height={16} className="opacity-90" />
                {t("sendCommand")}
              </div>
              <div className="relative">
                <div className="flex space-x-2">
                  <Input ref={inputRef} value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={handleKeyDown} onFocus={() => command && setShowSuggestions(filteredCommands.length > 0)} onBlur={() => setTimeout(() => setShowSuggestions(false), 100)} placeholder={t("enterMinecraftCommand")} disabled={!isServerRunning || executing} className="flex-1 bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30 font-mono" />
                  <Button type="button" onClick={() => executeCommand()} disabled={!isServerRunning || !command.trim() || executing} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-minecraft">
                    {executing ? (
                      <>
                        <Send className="h-4 w-4 animate-pulse" />
                        {t("sending")}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        {t("send")}
                      </>
                    )}
                  </Button>
                </div>

                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 z-10 bg-gray-800 border border-gray-700 rounded-md mt-1 shadow-lg max-h-48 overflow-auto">
                    {filteredCommands.map((suggestion, idx) => (
                      <div key={idx} onClick={() => handleSuggestionClick(suggestion.command)} className="p-2 hover:bg-gray-700 cursor-pointer flex justify-between border-b border-gray-700/50">
                        <span className="font-mono text-emerald-400">{suggestion.command}</span>
                        <span className="text-xs text-gray-400">{suggestion.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 pl-1">{t("pressTabToAutocomplete")}</p>
            </div>

            {response && (
              <div className="space-y-2">
                <div className="text-gray-300 font-minecraft text-sm mb-1 flex items-center gap-2">
                  <Image src="/images/redstone.webp" alt="Respuesta" width={16} height={16} className="opacity-90" />
                  {t("serverResponse")}
                </div>
                <div className="relative mt-1">
                  <div className="absolute top-2 right-2">
                    <Button type="button" variant="ghost" size="icon" onClick={clearResponse} className="h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-700/50">
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-4 bg-gray-950/80 text-emerald-400 border border-gray-700/50 rounded-md min-h-[200px] max-h-[400px] overflow-auto font-mono text-sm whitespace-pre-wrap">{response}</div>
                </div>
              </div>
            )}
          </>
        )}

        {activeSection === "players" && (
          <div className="space-y-4">
            {/* Header con refresh */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-300">
                <Users className="h-5 w-5 text-emerald-400" />
                <span className="font-minecraft">{t("playerManagement")}</span>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={fetchPlayerData} disabled={loadingPlayers} className="text-gray-400 hover:text-white">
                <RefreshCw className={`h-4 w-4 ${loadingPlayers ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {/* Quick Admin Actions */}
            <div className="p-3 bg-gray-800/50 rounded-lg border border-emerald-700/30">
              <div className="flex items-center gap-2 mb-3">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <span className="font-minecraft text-sm text-gray-200">{t("quickActions")}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                <Button type="button" variant="outline" size="sm" onClick={handleSaveWorld} className="text-xs gap-1">
                  <Save className="h-3 w-3" /> {t("saveWorld")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleWhitelistToggle(true)} className="text-xs gap-1">
                  <ShieldCheck className="h-3 w-3" /> {t("whitelistOn")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleWhitelistToggle(false)} className="text-xs gap-1">
                  <ShieldOff className="h-3 w-3" /> {t("whitelistOff")}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="text-xs gap-1">
                      <Sun className="h-3 w-3" /> {t("timeWeather")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-gray-800 border-gray-700">
                    <DropdownMenuItem onClick={() => handleSetTime("day")} className="text-gray-200 hover:bg-gray-700">
                      <Sun className="h-3 w-3 mr-2 text-yellow-400" /> {t("setDay")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSetTime("night")} className="text-gray-200 hover:bg-gray-700">
                      <Moon className="h-3 w-3 mr-2 text-blue-400" /> {t("setNight")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-700" />
                    <DropdownMenuItem onClick={() => handleSetWeather("clear")} className="text-gray-200 hover:bg-gray-700">
                      <Sun className="h-3 w-3 mr-2 text-yellow-400" /> {t("weatherClear")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSetWeather("rain")} className="text-gray-200 hover:bg-gray-700">
                      <CloudRain className="h-3 w-3 mr-2 text-blue-400" /> {t("weatherRain")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {/* Broadcast */}
              <div className="flex gap-2">
                <Input value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)} placeholder={t("broadcastPlaceholder")} className="flex-1 h-8 text-sm bg-gray-900/60 border-gray-700/50" onKeyDown={(e) => e.key === "Enter" && handleBroadcast()} />
                <Button type="button" size="sm" onClick={handleBroadcast} disabled={!broadcastMsg.trim()} className="bg-purple-600 hover:bg-purple-700 gap-1">
                  <MessageSquare className="h-3 w-3" /> {t("broadcast")}
                </Button>
              </div>
            </div>

            {/* Online Players */}
            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-green-400" />
                <span className="font-minecraft text-sm text-gray-200">{t("onlinePlayers")}</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {onlinePlayers.online}/{onlinePlayers.max}
                </Badge>
              </div>
              {onlinePlayers.players.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {onlinePlayers.players.map((player) => (
                    <div key={player} className="flex items-center gap-1 bg-gray-900/60 px-2 py-1 rounded text-sm">
                      <span className="text-gray-200">{player}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className="h-5 w-5 text-gray-400 hover:text-white">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-gray-800 border-gray-700 min-w-[160px]">
                          <DropdownMenuItem onClick={() => handleGamemode(player, "survival")} className="text-gray-200 hover:bg-gray-700">
                            <Gamepad2 className="h-3 w-3 mr-2" /> Survival
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleGamemode(player, "creative")} className="text-gray-200 hover:bg-gray-700">
                            <Gamepad2 className="h-3 w-3 mr-2" /> Creative
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleGamemode(player, "spectator")} className="text-gray-200 hover:bg-gray-700">
                            <Gamepad2 className="h-3 w-3 mr-2" /> Spectator
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-gray-700" />
                          <DropdownMenuItem onClick={() => handleTpToSpawn(player)} className="text-gray-200 hover:bg-gray-700">
                            <MapPin className="h-3 w-3 mr-2 text-blue-400" /> TP Spawn
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleHeal(player)} className="text-gray-200 hover:bg-gray-700">
                            <Heart className="h-3 w-3 mr-2 text-red-400" /> {t("heal")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleGiveItems(player, "diamond", 64)} className="text-gray-200 hover:bg-gray-700">
                            <Diamond className="h-3 w-3 mr-2 text-cyan-400" /> Give 64 💎
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-gray-700" />
                          <DropdownMenuItem onClick={() => handleKick(player)} className="text-amber-400 hover:bg-gray-700">
                            <Gavel className="h-3 w-3 mr-2" /> {t("kick")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBan(player)} className="text-red-400 hover:bg-gray-700">
                            <Ban className="h-3 w-3 mr-2" /> {t("ban")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">{t("noPlayersOnline")}</p>
              )}
            </div>

            {/* Whitelist */}
            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-blue-400" />
                <span className="font-minecraft text-sm text-gray-200">{t("whitelist")}</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {whitelist.length}
                </Badge>
              </div>
              <div className="flex gap-2 mb-2">
                <Input value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} placeholder={t("playerName")} className="flex-1 h-8 text-sm bg-gray-900/60 border-gray-700/50" onKeyDown={(e) => e.key === "Enter" && handleAddWhitelist()} />
                <Button type="button" size="sm" onClick={handleAddWhitelist} disabled={!newPlayerName.trim()} className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
              {whitelist.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-auto">
                  {whitelist.map((player) => (
                    <div key={player.uuid} className="flex items-center gap-1 bg-gray-900/60 px-2 py-1 rounded text-sm">
                      <span className="text-gray-200">{player.name}</span>
                      {ops.some((op) => op.uuid === player.uuid) && (
                        <span className="inline-flex" title="OP">
                          <Crown className="h-3 w-3 text-amber-400" />
                        </span>
                      )}
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 text-red-400 hover:text-red-300" onClick={() => handleRemoveWhitelist(player.name)} title={t("remove")}>
                        <UserMinus className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">{t("whitelistEmpty")}</p>
              )}
            </div>

            {/* Operators */}
            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-4 w-4 text-amber-400" />
                <span className="font-minecraft text-sm text-gray-200">{t("operators")}</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {ops.length}
                </Badge>
              </div>
              {ops.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {ops.map((op) => (
                    <div key={op.uuid} className="flex items-center gap-1 bg-gray-900/60 px-2 py-1 rounded text-sm">
                      <span className="text-gray-200">{op.name}</span>
                      <span className="text-xs text-gray-500">Lv{op.level}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 text-red-400 hover:text-red-300" onClick={() => handleRemoveOp(op.name)} title={t("demote")}>
                        <UserMinus className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">{t("noOperators")}</p>
              )}
              {/* Promover jugador a OP desde whitelist */}
              {whitelist.filter((p) => !ops.some((op) => op.uuid === p.uuid)).length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-700/30">
                  <p className="text-xs text-gray-400 mb-1">{t("promoteToOp")}:</p>
                  <div className="flex flex-wrap gap-1">
                    {whitelist
                      .filter((p) => !ops.some((op) => op.uuid === p.uuid))
                      .slice(0, 5)
                      .map((p) => (
                        <Button key={p.uuid} type="button" variant="outline" size="sm" className="text-xs h-6" onClick={() => handleAddOp(p.name)}>
                          {p.name}
                        </Button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Banned Players */}
            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Ban className="h-4 w-4 text-red-400" />
                <span className="font-minecraft text-sm text-gray-200">{t("bannedPlayers")}</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {banned.length}
                </Badge>
              </div>
              {banned.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-auto">
                  {banned.map((player) => (
                    <div key={player.uuid} className="flex items-center gap-1 bg-gray-900/60 px-2 py-1 rounded text-sm">
                      <span className="text-gray-200">{player.name}</span>
                      {player.reason && (
                        <span className="text-xs text-gray-500" title={player.reason}>
                          ({player.reason.slice(0, 10)}...)
                        </span>
                      )}
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 text-green-400 hover:text-green-300" onClick={() => handleUnban(player.name)} title={t("unban")}>
                        <UserPlus className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">{t("noBannedPlayers")}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t border-gray-700/40 pt-4">
        <div className="flex items-center text-xs text-gray-400">
          <Terminal className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
          <p>{t("commandsInfo")}</p>
        </div>
      </CardFooter>
    </Card>
  );
};
