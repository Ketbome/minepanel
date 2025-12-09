export type SupportedLanguage = 'en' | 'es' | 'nl';

export type ServerEventType = 'created' | 'deleted' | 'started' | 'stopped' | 'restarted' | 'error' | 'warning';

interface EventTranslation {
  title: string;
  status: string;
}

interface DiscordTranslations {
  events: Record<ServerEventType, EventTranslation>;
  fields: {
    server: string;
    status: string;
    port: string;
    version: string;
    details: string;
    events: string;
  };
  test: {
    title: string;
    description: string;
    success: string;
  };
}

export const discordTranslations: Record<SupportedLanguage, DiscordTranslations> = {
  en: {
    events: {
      created: { title: 'Server Created', status: 'CREATED' },
      deleted: { title: 'Server Deleted', status: 'DELETED' },
      started: { title: 'Server Online', status: 'ONLINE' },
      stopped: { title: 'Server Offline', status: 'OFFLINE' },
      restarted: { title: 'Server Restarted', status: 'RESTARTED' },
      error: { title: 'Server Error', status: 'ERROR' },
      warning: { title: 'Warning', status: 'WARNING' },
    },
    fields: {
      server: '📦 Server',
      status: '📊 Status',
      port: '🔌 Port',
      version: '🎮 Version',
      details: '💬 Details',
      events: '📋 Events',
    },
    test: {
      title: '✅ Connection Successful',
      description: 'Webhook is configured correctly.\nYou will receive server notifications here.',
      success: 'Test successful',
    },
  },
  es: {
    events: {
      created: { title: 'Servidor Creado', status: 'CREADO' },
      deleted: { title: 'Servidor Eliminado', status: 'ELIMINADO' },
      started: { title: 'Servidor Online', status: 'ONLINE' },
      stopped: { title: 'Servidor Offline', status: 'OFFLINE' },
      restarted: { title: 'Servidor Reiniciado', status: 'REINICIADO' },
      error: { title: 'Error del Servidor', status: 'ERROR' },
      warning: { title: 'Advertencia', status: 'ALERTA' },
    },
    fields: {
      server: '📦 Servidor',
      status: '📊 Estado',
      port: '🔌 Puerto',
      version: '🎮 Versión',
      details: '💬 Detalle',
      events: '📋 Eventos',
    },
    test: {
      title: '✅ Conexión Exitosa',
      description: 'El webhook está configurado correctamente.\nRecibirás notificaciones de tus servidores aquí.',
      success: 'Prueba exitosa',
    },
  },
  nl: {
    events: {
      created: { title: 'Server Aangemaakt', status: 'AANGEMAAKT' },
      deleted: { title: 'Server Verwijderd', status: 'VERWIJDERD' },
      started: { title: 'Server Online', status: 'ONLINE' },
      stopped: { title: 'Server Offline', status: 'OFFLINE' },
      restarted: { title: 'Server Herstart', status: 'HERSTART' },
      error: { title: 'Server Fout', status: 'FOUT' },
      warning: { title: 'Waarschuwing', status: 'WAARSCHUWING' },
    },
    fields: {
      server: '📦 Server',
      status: '📊 Status',
      port: '🔌 Poort',
      version: '🎮 Versie',
      details: '💬 Details',
      events: '📋 Gebeurtenissen',
    },
    test: {
      title: '✅ Verbinding Succesvol',
      description: 'Webhook is correct geconfigureerd.\nJe ontvangt hier servermeldingen.',
      success: 'Test geslaagd',
    },
  },
};

export const getTranslation = (lang: SupportedLanguage): DiscordTranslations => {
  return discordTranslations[lang] || discordTranslations.en;
};
