import { IPaymentGateway } from '../../domain/ports/IPaymentGateway';

export class MockStripePaymentGateway implements IPaymentGateway {
  private readonly mockSuccess: boolean;

  constructor() {
    // Configurable via environment variables
    this.mockSuccess = process.env.PAYMENT_MOCK_SUCCESS !== 'false';
  }

  public async charge(customerId: string, amount: number): Promise<boolean> {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate payment gateway failure for specific test customer IDs if needed
    if (customerId === 'cus_fail_payment') {
      return false;
    }
    if (customerId === 'cus_throw_error') {
      throw new Error('Stripe API Connection Timeout');
    }

    return this.mockSuccess;
  }
}
