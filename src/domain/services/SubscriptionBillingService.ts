import { ISubscriptionRepository } from '../ports/ISubscriptionRepository';
import { IUserRepository } from '../ports/IUserRepository';
import { IPaymentGateway } from '../ports/IPaymentGateway';
import { ITimeProvider } from '../ports/ITimeProvider';

export interface RenewalResult {
  success: boolean;
  message: string;
}

export class SubscriptionBillingService {
  constructor(
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly userRepo: IUserRepository,
    private readonly paymentGateway: IPaymentGateway,
    private readonly timeProvider: ITimeProvider
  ) {}

  public async processRenewal(userId: string): Promise<RenewalResult> {
    // RULE 1 — USER NOT FOUND
    const user = await this.userRepo.getUserById(userId);
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // RULE 2 — SUBSCRIPTION NOT FOUND
    const subscription = await this.subscriptionRepo.getSubscriptionByUserId(userId);
    if (!subscription) {
      return {
        success: false,
        message: 'Subscription not found'
      };
    }

    // RULE 3 — SUBSCRIPTION MUST BE EXPIRED
    const now = this.timeProvider.getCurrentTime();
    if (subscription.expiresAt > now) {
      return {
        success: false,
        message: 'Subscription is not yet expired'
      };
    }

    // RULE 4 — DECEMBER DISCOUNT (December is month index 11)
    let chargeAmount = subscription.basePrice;
    if (now.getMonth() === 11) {
      chargeAmount = subscription.basePrice * 0.9;
    }

    // RULE 5 & 6 — PAYMENT & PAYMENT EXCEPTION
    try {
      const paymentSuccess = await this.paymentGateway.charge(
        user.stripeCustomerId,
        chargeAmount
      );

      if (!paymentSuccess) {
        return {
          success: false,
          message: 'Payment failed'
        };
      }
    } catch (error) {
      // Do not leak infrastructure exception details
      return {
        success: false,
        message: 'Payment gateway error'
      };
    }

    // RULE 7 — SUCCESSFUL RENEWAL
    // Calculate next expiry: current time + exactly 1 year
    const newExpiry = new Date(now.getTime());
    newExpiry.setFullYear(newExpiry.getFullYear() + 1);

    await this.subscriptionRepo.updateExpiration(
      subscription.id,
      newExpiry
    );

    return {
      success: true,
      message: 'Renewal successful'
    };
  }
}
