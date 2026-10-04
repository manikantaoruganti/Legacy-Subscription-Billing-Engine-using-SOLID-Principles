export class Subscription {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly basePrice: number,
    public readonly expiresAt: Date
  ) {}
}
