import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<boolean>;
  enabled?: boolean;
  debounceMs?: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook personalizado para auto-guardar cambios
 * Detecta cambios en los datos y los guarda automáticamente con debounce
 */
export function useAutoSave<T>({ data, onSave, enabled = true, debounceMs = 1500, onSuccess, onError }: UseAutoSaveOptions<T>) {
  const previousDataRef = useRef<T>(data);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const mountedRef = useRef(true);

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
        onError?.(new Error("Save failed"));
      }
    } catch (error) {
      if (!mountedRef.current) return;
      onError?.(error as Error);
    } finally {
      if (mountedRef.current) {
        isSavingRef.current = false;
      }
    }
  }, [data, onSave, enabled, onSuccess, onError]);

  useEffect(() => {
    if (!enabled) return;

    // Comparar datos actuales con anteriores
    const hasChanged = JSON.stringify(data) !== JSON.stringify(previousDataRef.current);

    if (hasChanged && !isSavingRef.current) {
      // Limpiar timeout anterior
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Establecer nuevo timeout para auto-guardar
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

  // Método para forzar guardado inmediato
  const forceSave = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    await performSave();
  }, [performSave]);

  return { forceSave };
}

/**
 * Hook simplificado para auto-guardar con notificaciones por defecto
 */
export function useAutoSaveWithToast<T>(
  data: T,
  onSave: (data: T) => Promise<boolean>,
  options?: {
    enabled?: boolean;
    debounceMs?: number;
    showSuccessToast?: boolean;
  }
) {
  const showSuccessToast = options?.showSuccessToast ?? false;

  return useAutoSave({
    data,
    onSave,
    enabled: options?.enabled ?? true,
    debounceMs: options?.debounceMs ?? 1500,
    onSuccess: () => {
      if (showSuccessToast) {
        toast.success("Configuración guardada automáticamente", {
          duration: 2000,
        });
      }
    },
    onError: (error) => {
      console.error("Auto-save error:", error);
      toast.error("Error al guardar automáticamente");
    },
  });
}
