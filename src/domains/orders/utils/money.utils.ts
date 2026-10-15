/**
 * Converte preços no formato string ou número com ponto decimal para centavos inteiros (INTEGER)
 * evitando imprecisões de arredondamento em ponto flutuante binário (IEEE 754).
 */
export function parseNumericPriceToCents(priceStr: string | number): number {
  if (typeof priceStr === 'number') {
    if (isNaN(priceStr) || !isFinite(priceStr)) {
      throw new Error('Preço numérico inválido.');
    }
    priceStr = priceStr.toFixed(2);
  }

  const str = String(priceStr).trim();
  const parts = str.split('.');
  const integers = parts[0] ?? '';
  const decimals = parts[1] ?? '';

  const parsedIntegers = parseInt(integers, 10);
  if (isNaN(parsedIntegers) || parsedIntegers < 0) {
    throw new Error(`Parte inteira de preço inválida: ${integers}`);
  }

  // Completa casas decimais até 2 dígitos ou trunca
  const paddedDecimals = (decimals + '00').slice(0, 2);
  const parsedDecimals = parseInt(paddedDecimals, 10);
  if (isNaN(parsedDecimals) || parsedDecimals < 0) {
    throw new Error(`Parte decimal de preço inválida: ${decimals}`);
  }

  const totalCents = parsedIntegers * 100 + parsedDecimals;
  if (totalCents <= 0) {
    throw new Error('O valor monetário deve ser estritamente maior que zero.');
  }

  return totalCents;
}
