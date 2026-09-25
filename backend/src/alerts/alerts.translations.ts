import { SupportedLanguage } from 'src/discord/discord.service';

interface AlertMessages {
  downTitle: string;
  downDescription: string;
  cpuTitle: string;
  cpuDescription: string;
  memoryTitle: string;
  memoryDescription: string;
  serverField: string;
  usageField: string;
  thresholdField: string;
  sustainedField: string;
  minutes: string;
  crashTitle: string;
  crashDescription: string;
  exitCodeField: string;
  retriesField: string;
  logTailField: string;
}

const messages: Record<SupportedLanguage, AlertMessages> = {
  en: {
    downTitle: '🚨 Server Down',
    downDescription: 'The server stopped unexpectedly.',
    cpuTitle: '📈 High CPU Usage',
    cpuDescription: 'CPU usage has been above the configured threshold.',
    memoryTitle: '📈 High Memory Usage',
    memoryDescription: 'Memory usage has been above the configured threshold.',
    serverField: 'Server',
    usageField: 'Current usage',
    thresholdField: 'Threshold',
    sustainedField: 'Sustained for',
    minutes: 'min',
    crashTitle: '💥 Server crash loop',
    crashDescription: 'The server kept crashing and Docker stopped restarting it.',
    exitCodeField: 'Exit code',
    retriesField: 'Retries',
    logTailField: 'Last log lines',
  },
  es: {
    downTitle: '🚨 Servidor caído',
    downDescription: 'El servidor se detuvo inesperadamente.',
    cpuTitle: '📈 Uso alto de CPU',
    cpuDescription: 'El uso de CPU ha estado por encima del umbral configurado.',
    memoryTitle: '📈 Uso alto de memoria',
    memoryDescription: 'El uso de memoria ha estado por encima del umbral configurado.',
    serverField: 'Servidor',
    usageField: 'Uso actual',
    thresholdField: 'Umbral',
    sustainedField: 'Sostenido durante',
    minutes: 'min',
    crashTitle: '💥 Servidor en bucle de caídas',
    crashDescription: 'El servidor siguió cayéndose y Docker dejó de reiniciarlo.',
    exitCodeField: 'Código de salida',
    retriesField: 'Reintentos',
    logTailField: 'Últimas líneas del log',
  },
  nl: {
    downTitle: '🚨 Server offline',
    downDescription: 'De server is onverwacht gestopt.',
    cpuTitle: '📈 Hoog CPU-gebruik',
    cpuDescription: 'Het CPU-gebruik is boven de ingestelde drempel geweest.',
    memoryTitle: '📈 Hoog geheugengebruik',
    memoryDescription: 'Het geheugengebruik is boven de ingestelde drempel geweest.',
    serverField: 'Server',
    usageField: 'Huidig gebruik',
    thresholdField: 'Drempel',
    sustainedField: 'Aangehouden gedurende',
    minutes: 'min',
    crashTitle: '💥 Server blijft crashen',
    crashDescription: 'De server bleef crashen en Docker is gestopt met herstarten.',
    exitCodeField: 'Exitcode',
    retriesField: 'Pogingen',
    logTailField: 'Laatste logregels',
  },
  tr: {
    downTitle: '🚨 Sunucu kapandı',
    downDescription: 'Sunucu beklenmedik şekilde durdu.',
    cpuTitle: '📈 Yüksek CPU kullanımı',
    cpuDescription: 'CPU kullanımı ayarlanan eşiğin üzerinde seyrediyor.',
    memoryTitle: '📈 Yüksek bellek kullanımı',
    memoryDescription: 'Bellek kullanımı ayarlanan eşiğin üzerinde seyrediyor.',
    serverField: 'Sunucu',
    usageField: 'Güncel kullanım',
    thresholdField: 'Eşik',
    sustainedField: 'Kesintisiz',
    minutes: 'dk',
    crashTitle: '💥 Sunucu çökme döngüsünde',
    crashDescription: 'Sunucu çökmeye devam etti ve Docker yeniden başlatmayı bıraktı.',
    exitCodeField: 'Çıkış kodu',
    retriesField: 'Deneme sayısı',
    logTailField: 'Son günlük satırları',
  },
};

export const getAlertMessages = (lang: SupportedLanguage): AlertMessages => messages[lang] ?? messages.en;
