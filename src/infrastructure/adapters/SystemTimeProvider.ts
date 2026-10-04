import { ITimeProvider } from '../../domain/ports/ITimeProvider';

export class SystemTimeProvider implements ITimeProvider {
  public getCurrentTime(): Date {
    return new Date();
  }
}
