'use client';

import { FC, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useCanChangeVersion } from '@/lib/hooks/useCanChangeVersion';
import { mcToast } from '@/lib/utils/minecraft-toast';
import { getSuggestedJavaImage } from '@/lib/utils/java-image';
import { ServerConfig } from '@/lib/types/types';
import { ModpackInspection, ModpackLoader } from '@/services/modpacks/modpacks.service';
import { ModpackClientModsPanel } from './ModpackClientModsPanel';

const LOADERS: ModpackLoader[] = ['FORGE', 'NEOFORGE', 'FABRIC', 'QUILT'];

// The archive itself decides which install path the itzg image can take, so the
// server type is derived from the inspection instead of from what the user picked.
const SERVER_TYPE_FOR_KIND = {
  'curseforge-client': 'AUTO_CURSEFORGE',
  modrinth: 'MODRINTH',
  'server-pack': 'CURSEFORGE',
} as const;

const ARCHIVE_FIELDS = ['cfModpackZip', 'cfServerMod', 'modrinthModpack', 'genericPack'] as const;
type ArchiveField = (typeof ARCHIVE_FIELDS)[number];

interface ModpackZipGuidanceProps {
  readonly serverId: string;
  readonly inspection: ModpackInspection | null;
  readonly containerPath?: string;
  readonly config: ServerConfig;
  readonly updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export const ModpackZipGuidance: FC<ModpackZipGuidanceProps> = ({ serverId, inspection, containerPath, config, updateConfig }) => {
  const { t } = useLanguage();
  const canChangeVersion = useCanChangeVersion();
  const [loader, setLoader] = useState<ModpackLoader>('NEOFORGE');
  const [version, setVersion] = useState('');

  // Only the first inspection of an archive seeds the manual fields; after that the
  // user is editing them.
  const seededFor = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!inspection || seededFor.current === containerPath) return;
    seededFor.current = containerPath;
    if (inspection.loader) setLoader(inspection.loader);
    setVersion(inspection.minecraftVersion ?? config.minecraftVersion ?? '');
  }, [inspection, containerPath, config.minecraftVersion]);

  const expectedType = inspection ? SERVER_TYPE_FOR_KIND[inspection.kind as keyof typeof SERVER_TYPE_FOR_KIND] : undefined;
  const matchesCurrentType = expectedType === config.serverType;

  // A modpack pins the Minecraft version, and the Java image is manual for
  // modpacks, so both follow what the archive declares.
  const applyVersion = (minecraftVersion?: string) => {
    if (!canChangeVersion || !minecraftVersion) return;
    if (minecraftVersion !== config.minecraftVersion) updateConfig('minecraftVersion', minecraftVersion);

    const javaImage = getSuggestedJavaImage(minecraftVersion);
    if (javaImage !== config.dockerImage) updateConfig('dockerImage', javaImage);
  };

  // An archive that is already installed the right way still pins a Minecraft
  // version, so it is applied without asking.
  const applyVersionRef = useRef(applyVersion);
  applyVersionRef.current = applyVersion;
  const autoAppliedFor = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!matchesCurrentType || !inspection?.minecraftVersion || autoAppliedFor.current === containerPath) return;
    autoAppliedFor.current = containerPath;
    applyVersionRef.current(inspection.minecraftVersion);
  }, [matchesCurrentType, inspection?.minecraftVersion, containerPath]);

  if (!inspection || !containerPath) return null;

  // Each install path reads a different field, so the other two are cleared to
  // keep a single source for the archive.
  const selectArchiveField = (field: ArchiveField, value = containerPath) => {
    for (const other of ARCHIVE_FIELDS) {
      if (other !== field && config[other]) updateConfig(other, '');
    }
    updateConfig(field, value);
  };

  // The filtered copy has to replace the original wherever it is referenced, and
  // only the field currently holding it knows where that is.
  const replaceArchive = (nextContainerPath: string) => {
    const field = ARCHIVE_FIELDS.find((candidate) => config[candidate] === containerPath);
    if (field) updateConfig(field, nextContainerPath);
  };

  const applyExpectedType = () => {
    if (inspection.kind === 'curseforge-client') {
      updateConfig('serverType', 'AUTO_CURSEFORGE');
      updateConfig('cfMethod', 'file');
      selectArchiveField('cfModpackZip');
    } else if (inspection.kind === 'server-pack') {
      updateConfig('serverType', 'CURSEFORGE');
      selectArchiveField('cfServerMod');
    } else if (inspection.kind === 'modrinth') {
      updateConfig('serverType', 'MODRINTH');
      selectArchiveField('modrinthModpack');
    }

    applyVersion(inspection.minecraftVersion);
    mcToast.success(t('modpackGuidanceApplied'));
  };

  const applyLoader = () => {
    updateConfig('serverType', loader);
    selectArchiveField('genericPack');
    applyVersion(version.trim() || undefined);
    mcToast.success(t('modpackGuidanceApplied'));
  };

  // Only archives the image unpacks as-is need a review: for a CurseForge client
  // pack the image applies its own client-mod exclusions.
  const unpackedAsIs = inspection.kind === 'generic' || inspection.kind === 'server-pack';
  const modsPanel = unpackedAsIs ? (
    <ModpackClientModsPanel serverId={serverId} containerPath={containerPath} onStripped={replaceArchive} />
  ) : null;

  if (inspection.kind === 'generic') {
    return (
      <>
      <div className="space-y-3 border-2 border-amber-500/40 bg-amber-900/15 p-3">
        <p className="flex items-center gap-2 font-minecraft text-xs text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t('modpackNeedsLoaderTitle')}
        </p>
        <p className="text-[11px] leading-relaxed text-amber-100/80">{t('modpackNeedsLoaderDesc')}</p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1">
            <Label className="font-minecraft text-[11px] text-gray-300">{t('modpackLoaderLabel')}</Label>
            <Select value={loader} onValueChange={(value) => setLoader(value as ModpackLoader)}>
              <SelectTrigger className="h-9 border-gray-700/50 bg-gray-900/70 text-xs text-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-gray-700 bg-gray-800 text-gray-200">
                {LOADERS.map((option) => (
                  <SelectItem key={option} value={option} className="text-xs">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="modpackLoaderVersion" className="font-minecraft text-[11px] text-gray-300">
              {t('minecraftVersion')}
            </Label>
            <Input
              id="modpackLoaderVersion"
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              placeholder="1.21.1"
              disabled={!canChangeVersion}
              className="h-9 border-gray-700/50 bg-gray-900/70 font-mono text-xs text-gray-200"
            />
          </div>

          <Button type="button" onClick={applyLoader} disabled={!version.trim()} className="h-9 font-minecraft text-xs">
            <Wand2 className="mr-1 h-3.5 w-3.5" />
            {t('modpackGuidanceApply')}
          </Button>
        </div>
      </div>
      {modsPanel}
      </>
    );
  }

  if (!expectedType) return null;

  if (matchesCurrentType) {
    return (
      <>
        <p className="flex items-center gap-2 border-2 border-emerald-500/30 bg-emerald-900/15 px-3 py-2 text-[11px] text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          {t('modpackGuidanceOk')}
        </p>
        {modsPanel}
      </>
    );
  }

  return (
    <div className="space-y-2 border-2 border-amber-500/40 bg-amber-900/15 p-3">
      <p className="flex items-center gap-2 font-minecraft text-xs text-amber-300">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {t('modpackWrongTypeTitle')}
      </p>
      <p className="text-[11px] leading-relaxed text-amber-100/80">
        {t('modpackWrongTypeDesc').replace('{type}', expectedType)}
      </p>
      <Button type="button" onClick={applyExpectedType} className="h-9 font-minecraft text-xs">
        <Wand2 className="mr-1 h-3.5 w-3.5" />
        {t('modpackGuidanceSwitchTo').replace('{type}', expectedType)}
      </Button>
      {modsPanel}
    </div>
  );
};
