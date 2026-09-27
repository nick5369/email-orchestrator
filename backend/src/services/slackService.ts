import { WebClient } from '@slack/web-api';
import { prisma } from '../config/db';
import { config } from '../config/env';
import { encryptText, decryptText } from '../utils/encryption';
import { logger } from '../utils/logger';

export class SlackService {
  /**
   * Exchanges authorization code for Slack access token & webhook URL.
   */
  public static async handleOAuthCallback(code: string, userId: string): Promise<any> {
    const params = new URLSearchParams({
      client_id: config.slackClientId,
      client_secret: config.slackClientSecret,
      code,
      redirect_uri: config.slackRedirectUri,
    });

    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = (await response.json()) as any;
    if (!data.ok) {
      logger.error('Slack OAuth token exchange failed:', data);
      throw new Error(`Slack OAuth error: ${data.error || 'Failed to exchange authorization code'}`);
    }

    const botAccessToken = data.access_token || data.authed_user?.access_token || '';
    const webhookUrl = data.incoming_webhook?.url || '';
    const channelId = data.incoming_webhook?.channel_id || '';
    const channelName = data.incoming_webhook?.channel || '';
    const teamId = data.team?.id || 'UNKNOWN';
    const teamName = data.team?.name || 'Slack Team';

    const encryptedToken = encryptText(botAccessToken);
    const encryptedWebhook = encryptText(webhookUrl);

    const integration = await prisma.slackIntegration.upsert({
      where: { userId },
      create: {
        userId,
        slackTeamId: teamId,
        slackTeamName: teamName,
        botAccessToken: encryptedToken,
        channelId,
        channelName,
        webhookUrl: encryptedWebhook,
      },
      update: {
        slackTeamId: teamId,
        slackTeamName: teamName,
        botAccessToken: encryptedToken,
        channelId,
        channelName,
        webhookUrl: encryptedWebhook,
      },
    });

    logger.info(`Slack connected successfully for user ${userId} (Team: ${teamName})`);
    return integration;
  }

  /**
   * Sends a rate limit breach alert notification to user's connected Slack workspace.
   */
  public static async sendRateLimitNotification(
    userId: string,
    senderEmail: string,
    maxHourlyLimit: number,
    nextWindowIso: string
  ): Promise<boolean> {
    try {
      const integration = await prisma.slackIntegration.findUnique({
        where: { userId },
      });

      if (!integration) {
        logger.info(`No Slack integration found for user ${userId}, skipping notification.`);
        return false;
      }

      const webhookUrl = decryptText(integration.webhookUrl || '');
      const botToken = decryptText(integration.botAccessToken || '');

      const messageBlocks = {
        text: `⚠️ Rate Limit Exceeded for Sender ${senderEmail}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '⚠️ EmailOrchestrator Scheduler: Sender Rate Limit Hit',
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Sender Email:*\n\`${senderEmail}\``,
              },
              {
                type: 'mrkdwn',
                text: `*Configured Hourly Limit:*\n\`${maxHourlyLimit} emails/hr\``,
              },
              {
                type: 'mrkdwn',
                text: `*Status:*\nRescheduled to next window`,
              },
              {
                type: 'mrkdwn',
                text: `*Next Execution Window:*\n\`${nextWindowIso}\``,
              },
            ],
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '🤖 EmailOrchestrator Automated Protection System — No email lost or dropped.',
              },
            ],
          },
        ],
      };

      // 1. Try sending via Incoming Webhook if available
      if (webhookUrl && webhookUrl.startsWith('http')) {
        const webhookRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messageBlocks),
        });

        if (webhookRes.ok) {
          logger.info(`Slack rate limit alert delivered via Webhook for sender ${senderEmail}`);
          return true;
        }
      }

      // 2. Fall back to WebClient chat.postMessage if botAccessToken and channelId are present
      if (botToken && integration.channelId) {
        const client = new WebClient(botToken);
        await client.chat.postMessage({
          channel: integration.channelId,
          text: messageBlocks.text,
          blocks: messageBlocks.blocks as any,
        });
        logger.info(`Slack rate limit alert delivered via WebClient for sender ${senderEmail}`);
        return true;
      }

      logger.warn(`Slack integration present for user ${userId} but no valid transport available`);
      return false;
    } catch (error) {
      logger.error(`Failed to dispatch Slack rate limit notification for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Disconnects Slack for a user.
   */
  public static async disconnectSlack(userId: string): Promise<boolean> {
    try {
      await prisma.slackIntegration.delete({
        where: { userId },
      });
      logger.info(`Disconnected Slack for user ${userId}`);
      return true;
    } catch (error) {
      logger.warn(`Failed to disconnect Slack for user ${userId}:`, error);
      return false;
    }
  }
}
