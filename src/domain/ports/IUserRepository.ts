import { User } from '../models/User';

export interface IUserRepository {
  getUserById(userId: string): Promise<User | null>;
}
