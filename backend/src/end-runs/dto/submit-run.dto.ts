import { IsIn, IsInt, IsObject, Max, Min } from 'class-validator';

// the journey's timed modes and the zones it records a split for, mirrored by
// frontend/src/components/organisms/settings/end/store (mode, splits)
export const RUN_MODES = ['speedrun', 'hardcore'] as const;
export const SPLIT_ZONES = ['nether', 'stronghold', 'end', 'endcity'] as const;

export type RunMode = (typeof RUN_MODES)[number];

export class SubmitRunDto {
  @IsIn(RUN_MODES)
  mode: RunMode;

  // a minute to a day: anything outside is broken, not fast
  @IsInt()
  @Min(60_000)
  @Max(86_400_000)
  timeMs: number;

  @IsObject()
  splits: Record<string, number>;
}
