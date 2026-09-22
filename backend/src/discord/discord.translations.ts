export type SupportedLanguage = 'en' | 'es' | 'nl' | 'tr';

export type ServerEventType = 'created' | 'deleted' | 'started' | 'stopped' | 'restarted' | 'error' | 'warning';

interface EventTranslation {
  titles: string[];
  descriptions: string[];
  status: string;
  emoji: string;
}

interface DiscordTranslations {
  events: Record<ServerEventType, EventTranslation>;
  test: {
    title: string;
    description: string;
    features: string[];
    success: string;
  };
  footer: string[];
}

const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const discordTranslations: Record<SupportedLanguage, DiscordTranslations> = {
  en: {
    events: {
      created: {
        titles: ['New World Unlocked', 'Server Ready', 'A New Adventure Begins', 'World Generated'],
        descriptions: [
          'Your new server is ready to rock 🎸',
          'Fresh world, fresh adventures await',
          'Time to build something awesome',
          'The server awaits its first players',
        ],
        status: 'CREATED',
        emoji: '🌍',
      },
      deleted: {
        titles: ['World Deleted', 'Server Removed', 'The End', 'Farewell'],
        descriptions: [
          'This world has been archived to the void',
          'Server removed successfully',
          "Gone, but the memories remain",
          'Another chapter closes',
        ],
        status: 'DELETED',
        emoji: '🗑️',
      },
      started: {
        titles: ["We're Live!", 'Server Online', 'Game On', 'Powered Up'],
        descriptions: [
          'Server is up and running! Jump in 🎮',
          'The portal is open, players welcome',
          'All systems go, time to play',
          'Server started successfully',
        ],
        status: 'ONLINE',
        emoji: '🟢',
      },
      stopped: {
        titles: ['Server Offline', 'Taking a Break', 'Powered Down', 'See You Soon'],
        descriptions: [
          'Server is taking a nap 😴',
          'Shutting down gracefully',
          'Server stopped, worlds saved',
          'The server rests... for now',
        ],
        status: 'OFFLINE',
        emoji: '🔴',
      },
      restarted: {
        titles: ['Quick Restart', 'Rebooting', 'Be Right Back', 'Refreshing'],
        descriptions: [
          'Server is stretching its legs 🏃',
          'Quick restart in progress',
          'Clearing the cobwebs...',
          'Back online in a moment',
        ],
        status: 'RESTART',
        emoji: '🔄',
      },
      error: {
        titles: ['Uh Oh', 'Something Broke', 'Error Detected', 'Houston...'],
        descriptions: [
          'Something went wrong, checking logs...',
          'The server ran into trouble',
          'An error occurred, investigating',
          'Creeper blew up something important',
        ],
        status: 'ERROR',
        emoji: '💥',
      },
      warning: {
        titles: ['Heads Up', 'Warning', 'Attention', 'Watch Out'],
        descriptions: [
          'Something needs your attention',
          'Warning detected, check it out',
          'The server is trying to tell you something',
          'Minor issue detected',
        ],
        status: 'WARNING',
        emoji: '⚠️',
      },
    },
    test: {
      title: '🎮 Connection Test',
      description: "Everything's connected! You'll receive notifications here.",
      features: ['Server start/stop', 'Errors & warnings', 'Server creation'],
      success: 'Test successful',
    },
    footer: ['MinePanel', 'Powered by MinePanel', '⛏️ MinePanel'],
  },
  es: {
    events: {
      created: {
        titles: ['Nuevo Mundo', 'Server Listo', 'Nueva Aventura', 'Mundo Generado'],
        descriptions: [
          'Tu nuevo server está listo para la acción 🎸',
          'Mundo nuevo, aventuras nuevas',
          'Hora de construir algo épico',
          'El server espera a sus primeros jugadores',
        ],
        status: 'CREADO',
        emoji: '🌍',
      },
      deleted: {
        titles: ['Mundo Eliminado', 'Server Borrado', 'The End', 'Adiós'],
        descriptions: [
          'Este mundo fue archivado al void',
          'Server eliminado correctamente',
          'Se fue, pero los recuerdos quedan',
          'Otro capítulo se cierra',
        ],
        status: 'ELIMINADO',
        emoji: '🗑️',
      },
      started: {
        titles: ['Estamos Online!', 'Server Arriba', 'A Jugar', 'Encendido'],
        descriptions: [
          'Server andando, entren! 🎮',
          'El portal está abierto',
          'Todo listo, hora de jugar',
          'Server iniciado correctamente',
        ],
        status: 'ONLINE',
        emoji: '🟢',
      },
      stopped: {
        titles: ['Server Offline', 'Descansando', 'Apagado', 'Hasta Pronto'],
        descriptions: [
          'El server se fue a dormir 😴',
          'Apagando tranquilamente',
          'Server detenido, mundos guardados',
          'El server descansa... por ahora',
        ],
        status: 'OFFLINE',
        emoji: '🔴',
      },
      restarted: {
        titles: ['Reinicio Rápido', 'Reiniciando', 'Ya Volvemos', 'Refrescando'],
        descriptions: [
          'El server está estirando las piernas 🏃',
          'Reinicio rápido en progreso',
          'Limpiando telarañas...',
          'De vuelta en un momento',
        ],
        status: 'REINICIO',
        emoji: '🔄',
      },
      error: {
        titles: ['Ups', 'Algo Se Rompió', 'Error Detectado', 'Houston...'],
        descriptions: [
          'Algo salió mal, revisando logs...',
          'El server tuvo un problema',
          'Ocurrió un error, investigando',
          'Un creeper explotó algo importante',
        ],
        status: 'ERROR',
        emoji: '💥',
      },
      warning: {
        titles: ['Ojo', 'Advertencia', 'Atención', 'Cuidado'],
        descriptions: [
          'Algo necesita tu atención',
          'Advertencia detectada, revísala',
          'El server intenta decirte algo',
          'Problema menor detectado',
        ],
        status: 'ALERTA',
        emoji: '⚠️',
      },
    },
    test: {
      title: '🎮 Test de Conexión',
      description: 'Todo conectado! Recibirás notificaciones acá.',
      features: ['Inicio/parada', 'Errores y alertas', 'Creación de servers'],
      success: 'Test exitoso',
    },
    footer: ['MinePanel', 'Powered by MinePanel', '⛏️ MinePanel'],
  },
  nl: {
    events: {
      created: {
        titles: ['Nieuwe Wereld', 'Server Klaar', 'Nieuw Avontuur', 'Wereld Gegenereerd'],
        descriptions: [
          'Je nieuwe server is klaar voor actie 🎸',
          'Nieuwe wereld, nieuwe avonturen',
          'Tijd om iets geweldigs te bouwen',
          'De server wacht op zijn eerste spelers',
        ],
        status: 'AANGEMAAKT',
        emoji: '🌍',
      },
      deleted: {
        titles: ['Wereld Verwijderd', 'Server Weg', 'The End', 'Vaarwel'],
        descriptions: [
          'Deze wereld is naar de void gestuurd',
          'Server succesvol verwijderd',
          'Weg, maar de herinneringen blijven',
          'Nog een hoofdstuk sluit',
        ],
        status: 'VERWIJDERD',
        emoji: '🗑️',
      },
      started: {
        titles: ['We Zijn Live!', 'Server Online', 'Game On', 'Opgestart'],
        descriptions: [
          'Server draait, spring erin! 🎮',
          'De portal is open',
          'Alles klaar, tijd om te spelen',
          'Server succesvol gestart',
        ],
        status: 'ONLINE',
        emoji: '🟢',
      },
      stopped: {
        titles: ['Server Offline', 'Pauze', 'Uitgeschakeld', 'Tot Snel'],
        descriptions: [
          'Server is aan het slapen 😴',
          'Netjes aan het afsluiten',
          'Server gestopt, werelden opgeslagen',
          'De server rust... voor nu',
        ],
        status: 'OFFLINE',
        emoji: '🔴',
      },
      restarted: {
        titles: ['Snelle Herstart', 'Herstarten', 'Zo Terug', 'Verfrissen'],
        descriptions: [
          'Server strekt zijn benen 🏃',
          'Snelle herstart bezig',
          'Spinnenwebben opruimen...',
          'Zo weer online',
        ],
        status: 'HERSTART',
        emoji: '🔄',
      },
      error: {
        titles: ['Oeps', 'Iets Kapot', 'Fout Gedetecteerd', 'Houston...'],
        descriptions: [
          'Er ging iets mis, logs bekijken...',
          'De server heeft een probleem',
          'Er is een fout opgetreden',
          'Een creeper blies iets belangrijks op',
        ],
        status: 'FOUT',
        emoji: '💥',
      },
      warning: {
        titles: ['Let Op', 'Waarschuwing', 'Attentie', 'Pas Op'],
        descriptions: [
          'Iets heeft je aandacht nodig',
          'Waarschuwing gedetecteerd',
          'De server probeert je iets te vertellen',
          'Klein probleem gedetecteerd',
        ],
        status: 'WAARSCHUWING',
        emoji: '⚠️',
      },
    },
    test: {
      title: '🎮 Verbindingstest',
      description: 'Alles verbonden! Je krijgt hier meldingen.',
      features: ['Server start/stop', 'Fouten & waarschuwingen', 'Server creatie'],
      success: 'Test geslaagd',
    },
    footer: ['MinePanel', 'Powered by MinePanel', '⛏️ MinePanel'],
  },
  tr: {
    events: {
      created: {
        titles: ['Yeni Dünya Açıldı', 'Sunucu Hazır', 'Yeni Bir Macera Başlıyor', 'Dünya Oluşturuldu'],
        descriptions: [
          'Yeni sunucun sahneye çıkmaya hazır 🎸',
          'Yepyeni dünya, yepyeni maceralar',
          'Harika bir şeyler inşa etme vakti',
          'Sunucu ilk oyuncularını bekliyor',
        ],
        status: 'OLUŞTURULDU',
        emoji: '🌍',
      },
      deleted: {
        titles: ['Dünya Silindi', 'Sunucu Kaldırıldı', 'The End', 'Hoşça kal'],
        descriptions: [
          'Bu dünya boşluğa arşivlendi',
          'Sunucu başarıyla kaldırıldı',
          'Gitti, ama anılar kaldı',
          'Bir bölüm daha kapandı',
        ],
        status: 'SİLİNDİ',
        emoji: '🗑️',
      },
      started: {
        titles: ['Yayındayız!', 'Sunucu Çevrimiçi', 'Oyun Başlasın', 'Çalışıyor'],
        descriptions: [
          'Sunucu ayakta ve çalışıyor! Atla gel 🎮',
          'Portal açıldı, oyuncular buyursun',
          'Her şey yolunda, oynama vakti',
          'Sunucu başarıyla başlatıldı',
        ],
        status: 'ONLINE',
        emoji: '🟢',
      },
      stopped: {
        titles: ['Sunucu Çevrimdışı', 'Mola Veriyor', 'Kapandı', 'Yakında Görüşürüz'],
        descriptions: [
          'Sunucu kestiriyor 😴',
          'Düzgünce kapatılıyor',
          'Sunucu durdu, dünyalar kaydedildi',
          'Sunucu dinleniyor... şimdilik',
        ],
        status: 'OFFLINE',
        emoji: '🔴',
      },
      restarted: {
        titles: ['Hızlı Yeniden Başlatma', 'Yeniden Başlıyor', 'Hemen Döneriz', 'Tazeleniyor'],
        descriptions: [
          'Sunucu biraz bacaklarını açıyor 🏃',
          'Hızlı yeniden başlatma sürüyor',
          'Tozu dumanı siliyoruz...',
          'Birazdan tekrar çevrimiçi',
        ],
        status: 'YENİDEN BAŞLATMA',
        emoji: '🔄',
      },
      error: {
        titles: ['Eyvah', 'Bir Şey Bozuldu', 'Hata Tespit Edildi', 'Houston...'],
        descriptions: [
          'Bir şeyler ters gitti, günlüklere bakılıyor...',
          'Sunucu bir sorunla karşılaştı',
          'Bir hata oluştu, inceleniyor',
          'Creeper önemli bir şeyi havaya uçurdu',
        ],
        status: 'HATA',
        emoji: '💥',
      },
      warning: {
        titles: ['Dikkat', 'Uyarı', 'Bakman Lazım', 'Gözünü Aç'],
        descriptions: [
          'Bir şey ilgini bekliyor',
          'Uyarı tespit edildi, bir bak',
          'Sunucu sana bir şey anlatmaya çalışıyor',
          'Küçük bir sorun tespit edildi',
        ],
        status: 'UYARI',
        emoji: '⚠️',
      },
    },
    test: {
      title: '🎮 Bağlantı Testi',
      description: 'Her şey bağlı! Bildirimleri buradan alacaksın.',
      features: ['Sunucu başlatma/durdurma', 'Hatalar ve uyarılar', 'Sunucu oluşturma'],
      success: 'Test başarılı',
    },
    footer: ['MinePanel', 'Powered by MinePanel', '⛏️ MinePanel'],
  },
};

export const getTranslation = (lang: SupportedLanguage): DiscordTranslations => {
  return discordTranslations[lang] || discordTranslations.en;
};

export const getRandomEvent = (lang: SupportedLanguage, type: ServerEventType) => {
  const t = getTranslation(lang);
  const event = t.events[type];
  return {
    title: pickRandom(event.titles),
    description: pickRandom(event.descriptions),
    status: event.status,
    emoji: event.emoji,
    footer: pickRandom(t.footer),
  };
};
