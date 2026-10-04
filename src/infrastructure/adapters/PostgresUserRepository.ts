import { Pool } from 'pg';
import { IUserRepository } from '../../domain/ports/IUserRepository';
import { User } from '../../domain/models/User';

export class PostgresUserRepository implements IUserRepository {
  constructor(private readonly pool: Pool) {}

  public async getUserById(userId: string): Promise<User | null> {
    const query = 'SELECT id, stripe_customer_id FROM users WHERE id = $1';
    const result = await this.pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new User(row.id, row.stripe_customer_id);
  }
}
