import { deliveryFailureReason, RateLimitedError, withRateLimitRetry } from './delivery-errors';

describe('rate-limit retries', () => {
  afterEach(() => jest.useRealTimers());
  it('retries an explicit rejection once after the provider delay', async () => {
    jest.useFakeTimers();
    const send = jest.fn().mockRejectedValueOnce(new RateLimitedError('0.1')).mockResolvedValue(undefined);
    const result = withRateLimitRetry(send);
    await jest.advanceTimersByTimeAsync(99);expect(send).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);await result;expect(send).toHaveBeenCalledTimes(2);
  });
  it.each([undefined, null, 'bad', -1, 3000, Infinity])('rejects missing or excessive delay %s', async (delay) => {
    const send = jest.fn().mockRejectedValue(new RateLimitedError(delay));
    await expect(withRateLimitRetry(send)).rejects.toBeInstanceOf(RateLimitedError);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('never retries an ambiguous timeout or retries twice', async () => {
    const timeout = Object.assign(new Error('private URL'), { name: 'TimeoutError' });
    const send = jest.fn().mockRejectedValue(timeout);
    await expect(withRateLimitRetry(send)).rejects.toBe(timeout);expect(send).toHaveBeenCalledTimes(1);
    const limited = jest.fn().mockRejectedValue(new RateLimitedError(0));
    await expect(withRateLimitRetry(limited)).rejects.toBeInstanceOf(RateLimitedError);expect(limited).toHaveBeenCalledTimes(2);
  });
  it('does not spend beyond the total deadline', async () => {
    jest.useFakeTimers().setSystemTime(0);
    const send = jest.fn().mockImplementation(async () => { jest.setSystemTime(11_900);throw new RateLimitedError(1); });
    await expect(withRateLimitRetry(send)).rejects.toBeInstanceOf(RateLimitedError);expect(send).toHaveBeenCalledTimes(1);
  });
  it('does not echo private provider messages', () => {
    expect(deliveryFailureReason(new Error('https://api.telegram.org/botsecret'))).toBe('Provider request failed');
  });
});
