import { useEffect, useRef, useCallback } from "react";
import { mcToast } from "@/lib/utils/minecraft-toast";
import { useLanguage } from "./useLanguage";

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<boolean>;
  enabled?: boolean;
  debounceMs?: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useAutoSave<T>({ data, onSave, enabled = true, debounceMs = 1500, onSuccess, onError }: UseAutoSaveOptions<T>) {
  const previousDataRef = useRef<T>(data);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const mountedRef = useRef(true);
  const { t } = useLanguage();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const performSave = useCallback(async () => {
    if (!enabled || isSavingRef.current) return;

    isSavingRef.current = true;

    try {
      const success = await onSave(data);
      if (!mountedRef.current) return;

      if (success) {
        previousDataRef.current = data;
        onSuccess?.();
      } else {
        onError?.(new Error(t("saveFailed")));
      }
    } catch (error) {
      if (!mountedRef.current) return;
      onError?.(error as Error);
    } finally {
      if (mountedRef.current) {
        isSavingRef.current = false;
      }
    }
  }, [enabled, onSave, data, onSuccess, onError, t]);

  useEffect(() => {
    if (!enabled) return;

    const hasChanged = JSON.stringify(data) !== JSON.stringify(previousDataRef.current);

    if (hasChanged && !isSavingRef.current) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        performSave();
      }, debounceMs);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, enabled, debounceMs, performSave]);

  const forceSave = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    await performSave();
  }, [performSave]);

  return { forceSave };
}

export function useAutoSaveWithToast<T>(
  data: T,
  onSave: (data: T) => Promise<boolean>,
  options?: {
    enabled?: boolean;
    debounceMs?: number;
    showSuccessToast?: boolean;
  }
) {
  const { t } = useLanguage();
  const showSuccessToast = options?.showSuccessToast ?? false;

  return useAutoSave({
    data,
    onSave,
    enabled: options?.enabled ?? true,
    debounceMs: options?.debounceMs ?? 1500,
    onSuccess: () => {
      if (showSuccessToast) {
        mcToast.success(t("configSavedAutomatically"), {
          duration: 2000,
        });
      }
    },
    onError: (error) => {
      console.error("Auto-save error:", error);
      mcToast.error(t("errorSavingAutomatically"));
    },
  });
}
