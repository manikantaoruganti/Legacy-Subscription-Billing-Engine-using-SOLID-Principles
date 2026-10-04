import { Pool } from 'pg';
import { ISubscriptionRepository } from '../../domain/ports/ISubscriptionRepository';
import { Subscription } from '../../domain/models/Subscription';

export class PostgresSubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly pool: Pool) {}

  public async getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
    const query = 'SELECT id, user_id, base_price, expires_at FROM subscriptions WHERE user_id = $1';
    const result = await this.pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new Subscription(
      row.id,
      row.user_id,
      parseFloat(row.base_price),
      new Date(row.expires_at)
    );
  }

  public async updateExpiration(subscriptionId: string, newExpiry: Date): Promise<void> {
    const query = 'UPDATE subscriptions SET expires_at = $1 WHERE id = $2';
    await this.pool.query(query, [newExpiry, subscriptionId]);
  }
}
