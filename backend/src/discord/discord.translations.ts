export type SupportedLanguage = 'en' | 'es' | 'nl';

export type ServerEventType = 'created' | 'deleted' | 'started' | 'stopped' | 'restarted' | 'error' | 'warning';

interface EventTranslation {
  titles: string[];
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
      created: {
        titles: ['New server ready', 'Server deployed', 'Fresh server incoming', 'World created'],
        status: 'READY',
      },
      deleted: {
        titles: ['Server removed', 'Gone but not forgotten', 'Server wiped', 'Farewell server'],
        status: 'DELETED',
      },
      started: {
        titles: ['Server is up!', 'We\'re live', 'Server online', 'Ready to play'],
        status: 'ONLINE',
      },
      stopped: {
        titles: ['Server down', 'Taking a break', 'Server offline', 'Lights out'],
        status: 'OFFLINE',
      },
      restarted: {
        titles: ['Quick restart', 'Back in a sec', 'Server rebooting', 'Fresh start'],
        status: 'RESTARTING',
      },
      error: {
        titles: ['Houston, we have a problem', 'Something broke', 'Server error', 'Uh oh...'],
        status: 'ERROR',
      },
      warning: {
        titles: ['Heads up', 'Watch out', 'Warning', 'Attention needed'],
        status: 'WARNING',
      },
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
      title: '👋 Hey there!',
      description: 'Webhook connected successfully.\nYou\'ll get notified about your servers here.',
      success: 'Test successful',
    },
  },
  es: {
    events: {
      created: {
        titles: ['Nuevo server listo', 'Server desplegado', 'Mundo creado', 'Server armado'],
        status: 'LISTO',
      },
      deleted: {
        titles: ['Server eliminado', 'Adiós server', 'Server borrado', 'RIP server'],
        status: 'ELIMINADO',
      },
      started: {
        titles: ['Server arriba!', 'Estamos online', 'Server encendido', 'A jugar!'],
        status: 'ONLINE',
      },
      stopped: {
        titles: ['Server apagado', 'Descansando...', 'Server offline', 'Se apagó'],
        status: 'OFFLINE',
      },
      restarted: {
        titles: ['Reinicio rápido', 'Ya volvemos', 'Server reiniciando', 'Reset completo'],
        status: 'REINICIANDO',
      },
      error: {
        titles: ['Algo salió mal', 'Se rompió algo', 'Error en el server', 'Ups...'],
        status: 'ERROR',
      },
      warning: {
        titles: ['Ojo con esto', 'Cuidado', 'Advertencia', 'Atención'],
        status: 'ALERTA',
      },
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
      title: '👋 Hola!',
      description: 'Webhook conectado correctamente.\nTe llegarán las notificaciones de tus servers acá.',
      success: 'Prueba exitosa',
    },
  },
  nl: {
    events: {
      created: {
        titles: ['Nieuwe server klaar', 'Server gedeployed', 'Wereld aangemaakt', 'Server gebouwd'],
        status: 'KLAAR',
      },
      deleted: {
        titles: ['Server verwijderd', 'Tot ziens server', 'Server gewist', 'RIP server'],
        status: 'VERWIJDERD',
      },
      started: {
        titles: ['Server is up!', 'We zijn live', 'Server online', 'Klaar om te spelen'],
        status: 'ONLINE',
      },
      stopped: {
        titles: ['Server uit', 'Even pauze', 'Server offline', 'Lichten uit'],
        status: 'OFFLINE',
      },
      restarted: {
        titles: ['Snelle herstart', 'Zo terug', 'Server herstart', 'Verse start'],
        status: 'HERSTART',
      },
      error: {
        titles: ['Er ging iets mis', 'Iets is kapot', 'Server fout', 'Oeps...'],
        status: 'FOUT',
      },
      warning: {
        titles: ['Let op', 'Pas op', 'Waarschuwing', 'Aandacht nodig'],
        status: 'WAARSCHUWING',
      },
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
      title: '👋 Hallo!',
      description: 'Webhook succesvol verbonden.\nJe krijgt hier meldingen over je servers.',
      success: 'Test geslaagd',
    },
  },
};

export const getTranslation = (lang: SupportedLanguage): DiscordTranslations => {
  return discordTranslations[lang] || discordTranslations.en;
};

export const getRandomTitle = (lang: SupportedLanguage, type: ServerEventType): string => {
  const t = getTranslation(lang);
  const titles = t.events[type].titles;
  return titles[Math.floor(Math.random() * titles.length)];
};
