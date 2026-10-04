export interface IPaymentGateway {
  charge(customerId: string, amount: number): Promise<boolean>;
}
