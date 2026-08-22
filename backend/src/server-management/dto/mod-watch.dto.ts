import { IsOptional, IsString, MaxLength, Matches, ValidateBy, ValidationOptions, buildMessage } from 'class-validator';

// A note key is a mod ref: a provider slug or a numeric project id. Anything outside this
// set cannot name a configured mod, so it is a typo or an injection attempt either way.
const MOD_REF_PATTERN = /^[a-zA-Z0-9._-]+$/;
const MAX_REF_LENGTH = 120;
const MAX_NOTE_LENGTH = 2000;
// Enough for a mod list an order of magnitude larger than any real pack, while still
// bounding what one request can write into server.json.
const MAX_NOTES = 500;

// class-validator has no decorator for "record of string to string", and the keys carry
// as much meaning as the values here, so both get checked.
const IsModNotes = (validationOptions?: ValidationOptions) =>
  ValidateBy(
    {
      name: 'isModNotes',
      validator: {
        validate: (value: unknown) => {
          if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
          const entries = Object.entries(value as Record<string, unknown>);
          if (entries.length > MAX_NOTES) return false;
          return entries.every(
            ([ref, note]) =>
              ref.length <= MAX_REF_LENGTH && MOD_REF_PATTERN.test(ref) && typeof note === 'string' && note.length <= MAX_NOTE_LENGTH,
          );
        },
        defaultMessage: buildMessage(
          (each) => `${each}$property must map at most ${MAX_NOTES} mod refs to notes of at most ${MAX_NOTE_LENGTH} characters`,
          validationOptions,
        ),
      },
    },
    validationOptions,
  );

/**
 * One write of the Mod Watch annotations on `server.json`.
 *
 * `notes` is the whole map rather than a single entry: the tab is the only thing that
 * knows which refs are still configured, so sending the pruned map is what keeps notes
 * for removed mods from accumulating. It matches how the panel already saves server
 * config — the client sends the state it wants, not a patch.
 */
export class UpdateModWatchDto {
  // null clears the watch; undefined leaves it alone.
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9._-]*$/, { message: 'targetVersion must be a Minecraft version' })
  targetVersion?: string | null;

  @IsOptional()
  @IsModNotes()
  notes?: Record<string, string>;
}
