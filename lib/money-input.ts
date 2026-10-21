// Live formatting for rupiah fields: dots between thousands, a comma for sen ("1.500.000,50").
// Pure, so it is tested directly; components/ui/money-input.tsx wires it to an <input>.
// The text it produces is also valid for parseMoney (lib/purchase/parse.ts), and `raw` is the
// plain form the item forms accept (validations/item.ts: digits with an optional ",dd").

const MAX_INTEGER_DIGITS = 15;
const MAX_FRACTION_DIGITS = 2;

export interface MoneyFormatted {
  /** What the person sees, e.g. "1.500.000,5". */
  text: string;
  /** Submittable value without thousands dots, e.g. "1500000,5". Empty when there are no digits. */
  raw: string;
  /** Caret position in `text` that keeps the caret next to the same digit it was next to before. */
  caret: number;
}

/**
 * Reformat whatever was typed or pasted. Only digits and one comma are kept; dots are always read as
 * thousands separators and are rebuilt, so "15000000", "15.000.000" and "1.5000.00" all give "15.000.000".
 */
export function formatMoneyInput(text: string, caret: number = text.length): MoneyFormatted {
  const sig: string[] = [];
  let before = 0;
  let hasComma = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch >= "0" && ch <= "9") sig.push(ch);
    else if (ch === "," && !hasComma) {
      hasComma = true;
      sig.push(ch);
    } else continue;
    if (i < caret) before++;
  }

  const commaAt = sig.indexOf(",");
  const integerDigits = commaAt === -1 ? sig : sig.slice(0, commaAt);
  const fractionDigits = (commaAt === -1 ? [] : sig.slice(commaAt + 1)).slice(0, MAX_FRACTION_DIGITS);

  let strip = 0;
  while (integerDigits.length - strip > 1 && integerDigits[strip] === "0") strip++;
  let integer = integerDigits.slice(strip, strip + MAX_INTEGER_DIGITS);
  before = Math.max(0, before - strip);

  if (integer.length === 0) {
    if (!hasComma) return { text: "", raw: "", caret: 0 };
    integer = ["0"]; // a lone comma reads as "0,"
    if (before > 0) before += 1;
  }

  const integerText = integer.join("");
  const grouped = integerText.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const fractionText = fractionDigits.join("");
  const formatted = grouped + (hasComma ? `,${fractionText}` : "");

  let position = 0;
  if (before > 0) {
    let seen = 0;
    position = formatted.length;
    for (let i = 0; i < formatted.length; i++) {
      if (formatted[i] !== ".") seen++;
      if (seen === before) {
        position = i + 1;
        break;
      }
    }
  }

  return { text: formatted, raw: integerText + (fractionText ? `,${fractionText}` : ""), caret: position };
}

/**
 * Turn a stored value into something the field can start with. Database decimals arrive as "15000000",
 * "15000000.50" or "15000000.00"; trailing zero sen are dropped.
 */
export function normalizeMoneyValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  const decimal = /^(\d+)\.(\d{1,2})$/.exec(text);
  if (!decimal) return text;
  const fraction = decimal[2].replace(/0+$/, "");
  return fraction ? `${decimal[1]},${fraction}` : decimal[1];
}
