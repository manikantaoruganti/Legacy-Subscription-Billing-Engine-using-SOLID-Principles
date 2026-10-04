import { Subscription } from '../models/Subscription';

export interface ISubscriptionRepository {
  getSubscriptionByUserId(userId: string): Promise<Subscription | null>;
  updateExpiration(subscriptionId: string, newExpiry: Date): Promise<void>;
}
