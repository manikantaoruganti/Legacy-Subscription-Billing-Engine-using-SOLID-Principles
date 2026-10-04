import express, { Express } from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Domain Service
import { SubscriptionBillingService } from '../domain/services/SubscriptionBillingService';

// Infrastructure Adapters
import { PostgresUserRepository } from '../infrastructure/adapters/PostgresUserRepository';
import { PostgresSubscriptionRepository } from '../infrastructure/adapters/PostgresSubscriptionRepository';
import { MockStripePaymentGateway } from '../infrastructure/adapters/MockStripePaymentGateway';
import { SystemTimeProvider } from '../infrastructure/adapters/SystemTimeProvider';

// Controller
import { RenewalController } from './controllers/RenewalController';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Database Pool Setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/subscription_billing'
});

// COMPOSITION ROOT: Wire up dependencies
const userRepository = new PostgresUserRepository(pool);
const subscriptionRepository = new PostgresSubscriptionRepository(pool);
const paymentGateway = new MockStripePaymentGateway();
const timeProvider = new SystemTimeProvider();

const billingService = new SubscriptionBillingService(
  subscriptionRepository,
  userRepository,
  paymentGateway,
  timeProvider
);

const renewalController = new RenewalController(billingService);

// Health Endpoint
app.get('/health', async (req, res) => {
  try {
    // Verify database connection
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// Renewal Endpoint
app.post('/api/renew', renewalController.handleRenewal);

// Start Server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(port, () => {
    console.log(`[Server]: Subscription Billing Engine running on port ${port}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[Server]: Shutting down gracefully...');
    server.close(async () => {
      await pool.end();
      console.log('[Server]: Database pool closed. Exit.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export { app, pool };
