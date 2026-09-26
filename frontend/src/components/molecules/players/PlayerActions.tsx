import { FC } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Ban, Crown, Diamond, Gamepad2, Gavel, Heart, MapPin, MoreVertical, Shield, ShieldOff, UserMinus, UserPlus } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";

interface PlayerActionsProps {
  name: string;
  online: boolean;
  whitelisted: boolean;
  op: boolean;
  banned: boolean;
  disabled: boolean;
  onRun: (command: string, successMessage: string) => void;
}

export const PlayerActions: FC<PlayerActionsProps> = ({ name, online, whitelisted, op, banned, disabled, onRun }) => {
  const { t } = useLanguage();
  const item = "text-gray-200 hover:bg-gray-700";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" disabled={disabled} className="h-7 w-7 text-gray-400 hover:text-white" title={disabled ? t("startServerToExecute") : undefined}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-gray-800 border-gray-700 min-w-[180px]">
        {online && (
          <>
            {["survival", "creative", "spectator"].map((mode) => (
              <DropdownMenuItem key={mode} onClick={() => onRun(`gamemode ${mode} ${name}`, t("gamemodeChanged"))} className={item}>
                <Gamepad2 className="h-3 w-3 mr-2" /> {mode[0].toUpperCase() + mode.slice(1)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuItem onClick={() => onRun(`tp ${name} 0 100 0`, t("playerTeleported"))} className={item}>
              <MapPin className="h-3 w-3 mr-2 text-blue-400" /> TP Spawn
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRun(`effect give ${name} minecraft:instant_health 1 10`, t("playerHealed"))} className={item}>
              <Heart className="h-3 w-3 mr-2 text-red-400" /> {t("heal")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRun(`give ${name} minecraft:diamond 64`, t("itemsGiven"))} className={item}>
              <Diamond className="h-3 w-3 mr-2 text-cyan-400" /> Give 64 💎
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-700" />
          </>
        )}
        {whitelisted ? (
          <DropdownMenuItem onClick={() => onRun(`whitelist remove ${name}`, t("playerRemovedFromWhitelist"))} className={item}>
            <ShieldOff className="h-3 w-3 mr-2" /> {t("removeFromWhitelist")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onRun(`whitelist add ${name}`, t("playerAddedToWhitelist"))} className={item}>
            <Shield className="h-3 w-3 mr-2 text-blue-400" /> {t("addToWhitelist")}
          </DropdownMenuItem>
        )}
        {op ? (
          <DropdownMenuItem onClick={() => onRun(`deop ${name}`, t("playerDemotedFromOp"))} className={item}>
            <UserMinus className="h-3 w-3 mr-2" /> {t("demote")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onRun(`op ${name}`, t("playerPromotedToOp"))} className={item}>
            <Crown className="h-3 w-3 mr-2 text-amber-400" /> {t("promoteToOp")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-gray-700" />
        {online && (
          <DropdownMenuItem onClick={() => onRun(`kick ${name}`, t("playerKicked"))} className="text-amber-400 hover:bg-gray-700">
            <Gavel className="h-3 w-3 mr-2" /> {t("kick")}
          </DropdownMenuItem>
        )}
        {banned ? (
          <DropdownMenuItem onClick={() => onRun(`pardon ${name}`, t("playerUnbanned"))} className="text-green-400 hover:bg-gray-700">
            <UserPlus className="h-3 w-3 mr-2" /> {t("unban")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onRun(`ban ${name}`, t("playerBanned"))} className="text-red-400 hover:bg-gray-700">
            <Ban className="h-3 w-3 mr-2" /> {t("ban")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
