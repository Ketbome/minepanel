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
  },
};

export const getAlertMessages = (lang: SupportedLanguage): AlertMessages => messages[lang] ?? messages.en;
