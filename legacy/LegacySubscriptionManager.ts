import { Pool } from 'pg';
import axios from 'axios';

/**
 * LEGACY GOD CLASS (Anti-pattern)
 * 
 * This class violates multiple SOLID principles:
 * 1. Single Responsibility Principle (SRP): Handles DB access, HTTP requests, time calculation, and business logic.
 * 2. Open/Closed Principle (OCP): Hardcoded to PostgreSQL and Stripe. Cannot extend without modifying code.
 * 3. Liskov Substitution Principle (LSP): No abstractions or interfaces.
 * 4. Interface Segregation Principle (ISP): No interfaces used.
 * 5. Dependency Inversion Principle (DIP): Depends directly on concrete classes (Pool, axios) and system clock.
 */
export class LegacySubscriptionManager {
  private pool: Pool;

  constructor() {
    // Hardcoded database connection details
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/subscription_billing'
    });
  }

  public async processRenewal(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Direct database query for user
      const userRes = await this.pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length === 0) {
        return { success: false, message: 'User not found' };
      }
      const user = userRes.rows[0];

      // 2. Direct database query for subscription
      const subRes = await this.pool.query('SELECT * FROM subscriptions WHERE user_id = $1', [userId]);
      if (subRes.rows.length === 0) {
        return { success: false, message: 'Subscription not found' };
      }
      const subscription = subRes.rows[0];

      // 3. Direct system clock access (Temporal Coupling)
      const now = new Date();
      const expiresAt = new Date(subscription.expires_at);

      if (expiresAt > now) {
        return { success: false, message: 'Subscription is not yet expired' };
      }

      // 4. Hardcoded business rule (December discount)
      let chargeAmount = parseFloat(subscription.base_price);
      if (now.getMonth() === 11) { // December is 11
        chargeAmount = chargeAmount * 0.9;
      }

      // 5. Direct external HTTP call (I/O Interleaving)
      try {
        const paymentResponse = await axios.post('https://api.stripe.com/v3/charges', {
          customer: user.stripe_customer_id,
          amount: Math.round(chargeAmount * 100), // cents
          currency: 'usd'
        }, {
          headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` }
        });

        if (paymentResponse.status !== 200) {
          return { success: false, message: 'Payment failed' };
        }
      } catch (paymentErr) {
        // Leaking infrastructure details or generic error
        return { success: false, message: 'Payment gateway error' };
      }

      // 6. Direct database update
      const newExpiry = new Date();
      newExpiry.setFullYear(newExpiry.getFullYear() + 1);

      await this.pool.query(
        'UPDATE subscriptions SET expires_at = $1 WHERE id = $2',
        [newExpiry, subscription.id]
      );

      return { success: true, message: 'Renewal successful' };
    } catch (err) {
      return { success: false, message: 'Internal server error' };
    }
  }
}
