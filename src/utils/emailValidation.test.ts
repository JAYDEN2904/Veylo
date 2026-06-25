import { isValidEmail } from './emailValidation';

describe('isValidEmail', () => {
  it('accepts common valid addresses', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('user.name+tag@example.com')).toBe(true);
  });

  it('rejects invalid strings', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
  });
});
