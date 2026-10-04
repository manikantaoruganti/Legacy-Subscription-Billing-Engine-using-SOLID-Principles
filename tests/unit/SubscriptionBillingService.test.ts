import { SubscriptionBillingService } from '../../src/domain/services/SubscriptionBillingService';
import { ISubscriptionRepository } from '../../src/domain/ports/ISubscriptionRepository';
import { IUserRepository } from '../../src/domain/ports/IUserRepository';
import { IPaymentGateway } from '../../src/domain/ports/IPaymentGateway';
import { ITimeProvider } from '../../src/domain/ports/ITimeProvider';
import { User } from '../../src/domain/models/User';
import { Subscription } from '../../src/domain/models/Subscription';

describe('SubscriptionBillingService Unit Tests', () => {
  let mockSubscriptionRepo: jest.Mocked<ISubscriptionRepository>;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockPaymentGateway: jest.Mocked<IPaymentGateway>;
  let mockTimeProvider: jest.Mocked<ITimeProvider>;
  let billingService: SubscriptionBillingService;

  beforeEach(() => {
    mockSubscriptionRepo = {
      getSubscriptionByUserId: jest.fn(),
      updateExpiration: jest.fn()
    };

    mockUserRepo = {
      getUserById: jest.fn()
    };

    mockPaymentGateway = {
      charge: jest.fn()
    };

    mockTimeProvider = {
      getCurrentTime: jest.fn()
    };

    billingService = new SubscriptionBillingService(
      mockSubscriptionRepo,
      mockUserRepo,
      mockPaymentGateway,
      mockTimeProvider
    );
  });

  // TEST 1: "should apply a 10% discount in December"
  it('should apply a 10% discount in December', async () => {
    const userId = 'user-expired-001';
    const user = new User(userId, 'cus_mock_expired_001');
    const subscription = new Subscription('sub-expired-001', userId, 100.00, new Date('2023-12-01T00:00:00Z'));
    
    // Injected time is in December (Month index 11)
    const decemberTime = new Date('2023-12-15T10:00:00Z');

    mockUserRepo.getUserById.mockResolvedValue(user);
    mockSubscriptionRepo.getSubscriptionByUserId.mockResolvedValue(subscription);
    mockTimeProvider.getCurrentTime.mockReturnValue(decemberTime);
    mockPaymentGateway.charge.mockResolvedValue(true);

    const result = await billingService.processRenewal(userId);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Renewal successful');
    // Assert payment gateway received 90 (100 * 0.9)
    expect(mockPaymentGateway.charge).toHaveBeenCalledWith('cus_mock_expired_001', 90.00);
  });

  // TEST 2: "should charge standard price in non-December months"
  it('should charge standard price in non-December months', async () => {
    const userId = 'user-expired-001';
    const user = new User(userId, 'cus_mock_expired_001');
    const subscription = new Subscription('sub-expired-001', userId, 100.00, new Date('2023-11-01T00:00:00Z'));
    
    // Injected time is in November (Month index 10)
    const novemberTime = new Date('2023-11-15T10:00:00Z');

    mockUserRepo.getUserById.mockResolvedValue(user);
    mockSubscriptionRepo.getSubscriptionByUserId.mockResolvedValue(subscription);
    mockTimeProvider.getCurrentTime.mockReturnValue(novemberTime);
    mockPaymentGateway.charge.mockResolvedValue(true);

    const result = await billingService.processRenewal(userId);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Renewal successful');
    // Assert charge is standard 100
    expect(mockPaymentGateway.charge).toHaveBeenCalledWith('cus_mock_expired_001', 100.00);
  });

  // TEST 3: "should fail gracefully if payment gateway fails"
  it('should fail gracefully if payment gateway fails', async () => {
    const userId = 'user-expired-001';
    const user = new User(userId, 'cus_mock_expired_001');
    const subscription = new Subscription('sub-expired-001', userId, 100.00, new Date('2023-11-01T00:00:00Z'));
    const now = new Date('2023-11-15T10:00:00Z');

    mockUserRepo.getUserById.mockResolvedValue(user);
    mockSubscriptionRepo.getSubscriptionByUserId.mockResolvedValue(subscription);
    mockTimeProvider.getCurrentTime.mockReturnValue(now);
    mockPaymentGateway.charge.mockResolvedValue(false); // Gateway returns false

    const result = await billingService.processRenewal(userId);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Payment failed');
    // Assert subscription expiration was NOT updated
    expect(mockSubscriptionRepo.updateExpiration).not.toHaveBeenCalled();
  });

  // TEST 4: "should fail if subscription is not yet expired"
  it('should fail if subscription is not yet expired', async () => {
    const userId = 'user-active-001';
    const user = new User(userId, 'cus_mock_active_001');
    // Subscription expires in the future
    const subscription = new Subscription('sub-active-001', userId, 100.00, new Date('2035-12-01T00:00:00Z'));
    const now = new Date('2023-11-15T10:00:00Z');

    mockUserRepo.getUserById.mockResolvedValue(user);
    mockSubscriptionRepo.getSubscriptionByUserId.mockResolvedValue(subscription);
    mockTimeProvider.getCurrentTime.mockReturnValue(now);

    const result = await billingService.processRenewal(userId);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Subscription is not yet expired');
    // Assert payment gateway was NOT called
    expect(mockPaymentGateway.charge).not.toHaveBeenCalled();
    // Assert subscription expiration was NOT updated
    expect(mockSubscriptionRepo.updateExpiration).not.toHaveBeenCalled();
  });

  // TEST 5: "should return User not found"
  it('should return User not found', async () => {
    const userId = 'user-does-not-exist-999';
    mockUserRepo.getUserById.mockResolvedValue(null);

    const result = await billingService.processRenewal(userId);

    expect(result.success).toBe(false);
    expect(result.message).toBe('User not found');
    expect(mockSubscriptionRepo.getSubscriptionByUserId).not.toHaveBeenCalled();
  });

  // TEST 6: "should return Subscription not found"
  it('should return Subscription not found', async () => {
    const userId = 'user-expired-001';
    const user = new User(userId, 'cus_mock_expired_001');

    mockUserRepo.getUserById.mockResolvedValue(user);
    mockSubscriptionRepo.getSubscriptionByUserId.mockResolvedValue(null);

    const result = await billingService.processRenewal(userId);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Subscription not found');
  });

  // TEST 7: "should return Payment gateway error when gateway throws"
  it('should return Payment gateway error when gateway throws', async () => {
    const userId = 'user-expired-001';
    const user = new User(userId, 'cus_mock_expired_001');
    const subscription = new Subscription('sub-expired-001', userId, 100.00, new Date('2023-11-01T00:00:00Z'));
    const now = new Date('2023-11-15T10:00:00Z');

    mockUserRepo.getUserById.mockResolvedValue(user);
    mockSubscriptionRepo.getSubscriptionByUserId.mockResolvedValue(subscription);
    mockTimeProvider.getCurrentTime.mockReturnValue(now);
    mockPaymentGateway.charge.mockRejectedValue(new Error('Stripe API Connection Timeout'));

    const result = await billingService.processRenewal(userId);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Payment gateway error');
    expect(mockSubscriptionRepo.updateExpiration).not.toHaveBeenCalled();
  });

  // TEST 8: "should update expiration exactly one year after the injected current time"
  it('should update expiration exactly one year after the injected current time', async () => {
    const userId = 'user-expired-001';
    const user = new User(userId, 'cus_mock_expired_001');
    const subscription = new Subscription('sub-expired-001', userId, 100.00, new Date('2023-11-01T00:00:00Z'));
    
    // Injected current time
    const now = new Date('2023-11-15T10:00:00Z');
    const expectedExpiry = new Date('2024-11-15T10:00:00Z');

    mockUserRepo.getUserById.mockResolvedValue(user);
    mockSubscriptionRepo.getSubscriptionByUserId.mockResolvedValue(subscription);
    mockTimeProvider.getCurrentTime.mockReturnValue(now);
    mockPaymentGateway.charge.mockResolvedValue(true);

    const result = await billingService.processRenewal(userId);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Renewal successful');
    // Assert updateExpiration was called with exactly 1 year after the injected current time
    expect(mockSubscriptionRepo.updateExpiration).toHaveBeenCalledWith('sub-expired-001', expectedExpiry);
  });
});
