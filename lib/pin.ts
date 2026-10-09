// PINs that are too easy to guess: repeated digits, runs, repeating pairs and a few
// very common choices. Four digits only gives 10,000 combinations, so avoiding the
// obvious ones matters.
const COMMON = new Set(["1004", "2580", "0852", "1357", "2468", "1590", "1379", "0007", "2000", "1010", "6969", "4200"]);

export function isWeakPin(pin: string): boolean {
  if (!/^\d{4}$/.test(pin)) return true;
  const d = pin.split("").map(Number);

  if (d.every((x) => x === d[0])) return true; // 0000, 1111 ...

  const step = d[1] - d[0];
  if ((step === 1 || step === -1) && d.every((x, i) => i === 0 || x - d[i - 1] === step)) return true; // 1234, 4321 ...

  if (d[0] === d[2] && d[1] === d[3]) return true; // 1212, 7878 ...
  if (d[0] === d[1] && d[2] === d[3]) return true; // 1122, 3344 ...

  return COMMON.has(pin);
}

export const WEAK_PIN_MESSAGE =
  "That PIN is too easy to guess (like 0000, 1234 or 1212). Please choose a different one.";
