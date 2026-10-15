import { describe, it, expect } from 'bun:test';
import { parseNumericPriceToCents } from '../../src/domains/orders/utils/money.utils';

describe('Money Parsing Utils (Cents Integers)', () => {
  it('should parse standard string decimal price to integer cents', () => {
    expect(parseNumericPriceToCents('120.50')).toBe(12050);
    expect(parseNumericPriceToCents('149.90')).toBe(14990);
    expect(parseNumericPriceToCents('10.00')).toBe(1000);
    expect(parseNumericPriceToCents('0.99')).toBe(99);
  });

  it('should parse single decimal digit correctly', () => {
    expect(parseNumericPriceToCents('10.5')).toBe(1050);
  });

  it('should parse integer string without decimal correctly', () => {
    expect(parseNumericPriceToCents('150')).toBe(15000);
  });

  it('should reject non-positive or invalid strings', () => {
    expect(() => parseNumericPriceToCents('0.00')).toThrow();
    expect(() => parseNumericPriceToCents('-10.00')).toThrow();
    expect(() => parseNumericPriceToCents('invalid')).toThrow();
  });
});
