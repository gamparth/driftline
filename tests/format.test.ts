import { describe, expect, it } from "vitest";
import { formatPercent, formatRange, formatValue } from "@/lib/format";

describe("formatValue", () => {
  it("scales precision with magnitude", () => {
    expect(formatValue(189.483)).toBe("189");
    expect(formatValue(91.89282)).toBe("91.9");
    expect(formatValue(1.42)).toBe("1.42");
    expect(formatValue(0.9502)).toBe("0.95");
  });

  it("drops trailing zeros rather than padding", () => {
    expect(formatValue(14.8)).toBe("14.8");
    expect(formatValue(44)).toBe("44");
    expect(formatValue(6.4)).toBe("6.4");
    expect(formatValue(0.7)).toBe("0.7");
  });

  it("leaves already-clean values untouched", () => {
    expect(formatValue(118)).toBe("118");
    expect(formatValue(22)).toBe("22");
    expect(formatValue(5.9)).toBe("5.9");
  });
});

describe("formatRange", () => {
  it("renders two-sided ranges", () => {
    expect(formatRange({ low: 70, high: 99 })).toBe("70 – 99");
    expect(formatRange({ low: 0.7014, high: 1.1991 })).toBe("0.7 – 1.2");
  });

  it("renders one-sided ranges with the right comparator", () => {
    expect(formatRange({ low: null, high: 5.7 })).toBe("< 5.7");
    expect(formatRange({ low: 40, high: null })).toBe("> 40");
  });

  it("renders an em dash when no range was printed", () => {
    expect(formatRange(null)).toBe("—");
  });
});

describe("formatPercent", () => {
  it("signs increases and trims noise", () => {
    expect(formatPercent(49.473)).toBe("+49.5%");
    expect(formatPercent(-11.25)).toBe("-11.3%");
    expect(formatPercent(34)).toBe("+34%");
  });
});
