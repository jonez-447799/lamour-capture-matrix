import crypto from 'crypto';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export interface WebhookVerificationOptions {
  rawBody: string | Buffer;
  signatureHeader: string;
  timestampHeader: string;
  primarySecret: string;
  secondarySecret?: string;
  maxAgeSeconds?: number;
}

export interface VerificationResult {
  isValid: boolean;
  reason?: string;
  eventId?: string;
}

export async function verifyPaymentWebhook(
  options: WebhookVerificationOptions
): Promise<VerificationResult> {
  const {
    rawBody,
    signatureHeader,
    timestampHeader,
    primarySecret,
    secondarySecret,
    maxAgeSeconds = 300
  } = options;

  const timestamp = parseInt(timestampHeader, 10);
  const now = Math.floor(Date.now() / 1000);
  if (isNaN(timestamp) || Math.abs(now - timestamp) > maxAgeSeconds) {
    return { isValid: false, reason: 'Timestamp outside 300-second window' };
  }

  const payload = `${timestamp}.${typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8')}`;

  const verifySignature = (secret: string): boolean => {
    const computedHmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const signatureBuffer = Buffer.from(signatureHeader, 'hex');
    const computedBuffer = Buffer.from(computedHmac, 'hex');

    if (signatureBuffer.length !== computedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(signatureBuffer, computedBuffer);
  };

  const isPrimaryValid = verifySignature(primarySecret);
  const isSecondaryValid = secondarySecret ? verifySignature(secondarySecret) : false;

  if (!isPrimaryValid && !isSecondaryValid) {
    return { isValid: false, reason: 'HMAC signature verification failed' };
  }

  // Atomic Firestore event-ID deduplication
  const db = getFirestore();
  const eventId = crypto.createHash('sha256').update(signatureHeader).digest('hex');
  const webhookRef = db.collection('processed_webhooks').doc(eventId);

  try {
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(webhookRef);
      if (doc.exists) {
        throw new Error('Duplicate webhook event');
      }
      transaction.set(webhookRef, {
        processedAt: FieldValue.serverTimestamp(),
        timestamp: timestamp
      });
    });
  } catch (err: any) {
    return { isValid: false, reason: err.message || 'Duplicate event detected', eventId };
  }

  return { isValid: true, eventId };
}
