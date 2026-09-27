import { Client } from '@elastic/elasticsearch';
import { config } from './env';
import { logger } from '../utils/logger';

export const esClient = new Client({
  node: config.elasticsearchNode,
  enableProductCheck: false,
} as any);

export const EMAIL_INDEX_NAME = 'email_orchestrator_emails_v1';

export async function initializeElasticsearchIndex(): Promise<boolean> {
  try {
    const exists = await esClient.indices.exists({ index: EMAIL_INDEX_NAME });
    if (!exists) {
      await esClient.indices.create({
        index: EMAIL_INDEX_NAME,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              senderId: { type: 'keyword' },
              senderEmail: { type: 'keyword' },
              recipient: {
                type: 'keyword',
                fields: {
                  text: { type: 'text' },
                },
              },
              subject: { type: 'text', analyzer: 'standard' },
              body: { type: 'text', analyzer: 'standard' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              createdAt: { type: 'date' },
            },
          },
        },
      });
      logger.info(`Elasticsearch index '${EMAIL_INDEX_NAME}' created successfully`);
    } else {
      logger.info(`Elasticsearch index '${EMAIL_INDEX_NAME}' already exists`);
    }
    return true;
  } catch (error) {
    logger.warn('Elasticsearch initialization failed (will use fallback DB search):', error);
    return false;
  }
}

export async function checkElasticsearchConnection(): Promise<boolean> {
  try {
    const ping = await esClient.ping({}, { requestTimeout: 1000 });
    return ping;
  } catch (error) {
    logger.warn('Elasticsearch ping failed (optional service):', error);
    return false;
  }
}
