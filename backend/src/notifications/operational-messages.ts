import { SupportedLanguage } from 'src/discord/discord.service';

const messages = {
  en: { task: 'Scheduled task failed', game: 'Game query failed', stale: 'Backup overdue', disk: 'Low disk space', backup: 'Backup failed', recovery: 'Incident resolved', description: 'Check the affected server or storage in Minepanel.', recovered: 'A previously detected incident is no longer present.' },
  tr: { task: 'Zamanlanmış görev başarısız', game: 'Oyun sorgusu başarısız', stale: 'Yedek gecikti', disk: 'Disk alanı azalıyor', backup: 'Yedekleme başarısız', recovery: 'Sorun düzeldi', description: 'Etkilenen sunucuyu veya depolamayı Minepanel üzerinden kontrol edin.', recovered: 'Daha önce tespit edilen sorun artık gözlenmiyor.' },
  es: { task: 'Tarea programada fallida', game: 'Consulta del juego fallida', stale: 'Copia atrasada', disk: 'Poco espacio en disco', backup: 'Copia de seguridad fallida', recovery: 'Incidente resuelto', description: 'Comprueba el servidor o almacenamiento afectado en Minepanel.', recovered: 'El incidente detectado anteriormente ya no está presente.' },
  nl: { task: 'Geplande taak mislukt', game: 'Spelquery mislukt', stale: 'Back-up te laat', disk: 'Weinig schijfruimte', backup: 'Back-up mislukt', recovery: 'Probleem opgelost', description: 'Controleer de betrokken server of opslag in Minepanel.', recovered: 'Het eerder vastgestelde probleem is niet meer aanwezig.' },
};

export function operationalMessages(language: SupportedLanguage) {
  return messages[language] ?? messages.en;
}
