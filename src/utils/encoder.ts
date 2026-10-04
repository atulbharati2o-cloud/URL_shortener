const ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const BASE = 62n;

export function encode(value: bigint): string {
  if (value < 0n) {
    throw new Error("Value cannot be negative");
  }

  if (value === 0n) {
    return ALPHABET[0]!;
  }

  let number = value;
  let result = "";

  while (number > 0n) {
    const remainder = number % BASE;

    const character = ALPHABET[Number(remainder)];

    if (character === undefined) {
      throw new Error("Invalid character index");
    }

    result = character + result;

    number = number / BASE;
  }

  return result;
}

export function decode(value: string): bigint {
  if (value.length === 0) {
    throw new Error("Value cannot be empty");
  }

  let result = 0n;

  for (const character of value) {
    const index = ALPHABET.indexOf(character);

    if (index === -1) {
      throw new Error(`Invalid character: ${character}`);
    }

    result = result * BASE + BigInt(index);
  }

  return result;
}