import { SupportedLanguage } from 'src/discord/discord.service';

const messages = {
  en: { disk: 'Low disk space', backup: 'Backup failed', recovery: 'Incident resolved', description: 'Check the affected server or storage in Minepanel.', recovered: 'A previously detected incident is no longer present.' },
  tr: { disk: 'Disk alanı azalıyor', backup: 'Yedekleme başarısız', recovery: 'Sorun düzeldi', description: 'Etkilenen sunucuyu veya depolamayı Minepanel üzerinden kontrol edin.', recovered: 'Daha önce tespit edilen sorun artık gözlenmiyor.' },
  es: { disk: 'Poco espacio en disco', backup: 'Copia de seguridad fallida', recovery: 'Incidente resuelto', description: 'Comprueba el servidor o almacenamiento afectado en Minepanel.', recovered: 'El incidente detectado anteriormente ya no está presente.' },
  nl: { disk: 'Weinig schijfruimte', backup: 'Back-up mislukt', recovery: 'Probleem opgelost', description: 'Controleer de betrokken server of opslag in Minepanel.', recovered: 'Het eerder vastgestelde probleem is niet meer aanwezig.' },
};

export function operationalMessages(language: SupportedLanguage) {
  return messages[language] ?? messages.en;
}
