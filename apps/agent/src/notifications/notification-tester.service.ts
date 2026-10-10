import { ConfigManager, AgentNotificationSettings } from '../config';
import { isSecretMaskedOrEmpty } from '../channels/channel-tester.service';
import { OrderNotifierService } from './order-notifier.service';

export class NotificationTesterService {
  constructor(private readonly configManager: ConfigManager) {}

  public resolveNotificationSettings(customSettings?: AgentNotificationSettings): AgentNotificationSettings {
    const cfg = this.configManager.get();
    const settings = customSettings || cfg.notifications || {};
    return {
      ...settings,
      smtpPass: customSettings && isSecretMaskedOrEmpty(customSettings.smtpPass) && cfg.notifications?.smtpPass
        ? cfg.notifications.smtpPass : settings.smtpPass,
      telegramBotToken: customSettings && isSecretMaskedOrEmpty(customSettings.telegramBotToken) && cfg.notifications?.telegramBotToken
        ? cfg.notifications.telegramBotToken : settings.telegramBotToken,
    };
  }

  public async testEmailNotification(custom?: AgentNotificationSettings): Promise<{ success: boolean; message: string }> {
    return OrderNotifierService.sendTestEmail(this.resolveNotificationSettings(custom));
  }

  public async testTelegramNotification(custom?: AgentNotificationSettings): Promise<{ success: boolean; message: string }> {
    return OrderNotifierService.sendTestTelegram(this.resolveNotificationSettings(custom));
  }

  public async testDiscordNotification(custom?: AgentNotificationSettings): Promise<{ success: boolean; message: string }> {
    return OrderNotifierService.sendTestDiscord(this.resolveNotificationSettings(custom));
  }
}
