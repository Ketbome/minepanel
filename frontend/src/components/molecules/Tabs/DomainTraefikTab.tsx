import { FC, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Globe, Shield } from "lucide-react";
import { ServerConfig } from "@/lib/types/types";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { checkTraefikStatus, validateDomain as validateDomainService } from "@/services/traefik/traefik.service";

interface DomainTraefikTabProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
  disabled?: boolean;
}

export const DomainTraefikTab: FC<DomainTraefikTabProps> = ({ config, updateConfig, disabled = false }) => {
  const { t } = useLanguage();
  const [traefikAvailable, setTraefikAvailable] = useState(false);
  const [checkingTraefik, setCheckingTraefik] = useState(true);
  const [domainValidation, setDomainValidation] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({
    checking: false,
    available: null,
    message: "",
  });

  useEffect(() => {
    checkTraefik();
  }, []);

  const checkTraefik = async () => {
    try {
      const data = await checkTraefikStatus();
      setTraefikAvailable(data.available);
    } catch (error) {
      console.error("Failed to check Traefik status:", error);
      setTraefikAvailable(false);
    } finally {
      setCheckingTraefik(false);
    }
  };

  const validateDomain = async (domain: string) => {
    if (!domain || domain.trim() === "") {
      setDomainValidation({ checking: false, available: null, message: "" });
      return;
    }

    setDomainValidation({ checking: true, available: null, message: "" });

    try {
      const data = await validateDomainService(config.id, domain);
      setDomainValidation({
        checking: false,
        available: data.available,
        message: data.message,
      });
    } catch (error) {
      console.error("Failed to validate domain:", error);
      setDomainValidation({
        checking: false,
        available: false,
        message: "Failed to validate domain",
      });
    }
  };

  const handleDomainChange = (value: string) => {
    updateConfig("domain", value);
    if (value.trim()) {
      const timeoutId = setTimeout(() => validateDomain(value), 500);
      return () => clearTimeout(timeoutId);
    }
  };

  if (checkingTraefik) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">{t("checkingTraefik")}</p>
      </div>
    );
  }

  if (!traefikAvailable) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("traefikNotAvailable")}</AlertTitle>
          <AlertDescription>{t("traefikNotAvailableDesc")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>{t("enableTraefik")}</CardTitle>
          </div>
          <CardDescription>{t("enableTraefikDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableTraefik">{t("enableTraefikLabel")}</Label>
              <p className="text-sm text-muted-foreground">{t("enableTraefikDesc")}</p>
            </div>
            <Switch id="enableTraefik" checked={config.enableTraefik || false} onCheckedChange={(value) => updateConfig("enableTraefik", value)} disabled={disabled} />
          </div>
        </CardContent>
      </Card>

      {config.enableTraefik && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle>{t("domainTitle")}</CardTitle>
              </div>
              <CardDescription>{t("domainDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain">{t("domainLabel")}</Label>
                <Input id="domain" value={config.domain || ""} onChange={(e) => handleDomainChange(e.target.value)} placeholder="mc.yourdomain.com or *" disabled={disabled} className="font-mono" />
                <p className="text-xs text-muted-foreground">{t("domainHint")}</p>

                {domainValidation.checking && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="animate-spin">⏳</span> {t("checkingDomain")}
                  </p>
                )}

                {!domainValidation.checking && domainValidation.available === true && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {domainValidation.message}
                  </p>
                )}

                {!domainValidation.checking && domainValidation.available === false && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {domainValidation.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableTcpRouting">{t("tcpRoutingLabel")}</Label>
                  <p className="text-sm text-muted-foreground">{t("tcpRoutingDescription")}</p>
                </div>
                <Switch id="enableTcpRouting" checked={config.enableTcpRouting ?? true} onCheckedChange={(value) => updateConfig("enableTcpRouting", value)} disabled={disabled || config.domain === "*"} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("infoTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("connectInfo")}</p>
                <p className="font-mono text-sm font-semibold">{config.domain && config.domain !== "*" ? config.domain : `your-server-ip:${config.port || "25565"}`}</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
