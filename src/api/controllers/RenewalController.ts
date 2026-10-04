import { Request, Response } from 'express';
import { SubscriptionBillingService } from '../../domain/services/SubscriptionBillingService';

export class RenewalController {
  constructor(private readonly billingService: SubscriptionBillingService) {}

  public handleRenewal = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.body;

      // Validation
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        res.status(400).json({
          success: false,
          message: 'Invalid or missing userId'
        });
        return;
      }

      const result = await this.billingService.processRenewal(userId);

      if (!result.success) {
        res.status(400).json({
          success: result.success,
          message: result.message
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      // Ensure no stack traces or internal details are leaked
      res.status(500).json({
        success: false,
        message: 'An unexpected error occurred'
      });
    }
  };
}
