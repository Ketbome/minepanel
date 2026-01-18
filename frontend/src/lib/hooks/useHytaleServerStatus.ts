import { useState, useEffect, useCallback } from 'react';
import { HytaleServerStatus } from '@/lib/types/hytale';
import {
  getHytaleServerStatus,
  startHytaleServer,
  stopHytaleServer,
} from '@/services/hytale/fetchs';
import { mcToast } from '@/lib/utils/minecraft-toast';

export function useHytaleServerStatus(serverId: string) {
  const [status, setStatus] = useState<HytaleServerStatus>('loading');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!serverId) return;
    
    try {
      const result = await getHytaleServerStatus(serverId);
      setStatus(result.status);
    } catch (error) {
      console.error('Error loading status:', error);
      setStatus('not_found');
    }
  }, [serverId]);

  useEffect(() => {
    loadStatus();
    
    const interval = setInterval(loadStatus, 10000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const startServer = useCallback(async (): Promise<boolean> => {
    setIsProcessingAction(true);
    setStatus('starting');
    
    try {
      const result = await startHytaleServer(serverId);
      if (result.success) {
        mcToast.success('Server starting...');
        setTimeout(loadStatus, 2000);
        return true;
      }
      mcToast.error('Failed to start server');
      await loadStatus();
      return false;
    } catch (error) {
      console.error('Error starting server:', error);
      mcToast.error('Error starting server');
      await loadStatus();
      return false;
    } finally {
      setIsProcessingAction(false);
    }
  }, [serverId, loadStatus]);

  const stopServer = useCallback(async (): Promise<boolean> => {
    setIsProcessingAction(true);
    
    try {
      const result = await stopHytaleServer(serverId);
      if (result.success) {
        mcToast.success('Server stopped');
        setStatus('stopped');
        return true;
      }
      mcToast.error('Failed to stop server');
      await loadStatus();
      return false;
    } catch (error) {
      console.error('Error stopping server:', error);
      mcToast.error('Error stopping server');
      await loadStatus();
      return false;
    } finally {
      setIsProcessingAction(false);
    }
  }, [serverId, loadStatus]);

  return {
    status,
    isProcessingAction,
    startServer,
    stopServer,
    refreshStatus: loadStatus,
  };
}
