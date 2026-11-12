/** Ниже этого порога счётчик токенов остаётся обычным числом. */
const TOKEN_COUNT_THOUSAND = 1_000;

const TOKEN_COUNT_MILLION = TOKEN_COUNT_THOUSAND * TOKEN_COUNT_THOUSAND;
const TOKEN_COUNT_BILLION = TOKEN_COUNT_MILLION * TOKEN_COUNT_THOUSAND;

const TOKEN_COMPACT_SCALES = [
  { threshold: TOKEN_COUNT_BILLION, suffix: "B" },
  { threshold: TOKEN_COUNT_MILLION, suffix: "M" },
  { threshold: TOKEN_COUNT_THOUSAND, suffix: "K" },
] as const;

const TOKEN_COMPACT_NEXT_SUFFIX = {
  K: "M",
  M: "B",
} as const;

/**
 * Короткая запись числа токенов: тысячи — K, миллионы — M, миллиарды — B.
 * 9872 становится 10K. До тысячи цифры не сокращаются.
 */
export function formatTokenCount(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const negative = value < 0;
  const absolute = Math.round(Math.abs(value));
  const formatted = formatAbsoluteTokenCount(absolute);
  return negative ? `-${formatted}` : formatted;
}

function formatAbsoluteTokenCount(absolute: number): string {
  for (const scale of TOKEN_COMPACT_SCALES) {
    if (absolute < scale.threshold) {
      continue;
    }

    const rounded = Math.round(absolute / scale.threshold);
    if (rounded >= TOKEN_COUNT_THOUSAND && scale.suffix !== "B") {
      return `1${TOKEN_COMPACT_NEXT_SUFFIX[scale.suffix]}`;
    }

    return `${rounded}${scale.suffix}`;
  }

  return String(absolute);
}
