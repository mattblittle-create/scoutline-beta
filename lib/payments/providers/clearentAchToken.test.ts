import { describe, expect, it, vi } from "vitest";
import { describeClearentAchTokenError, getClearentAchPaymentToken } from "./clearentAchToken";

describe("Xplor ACH token rejection diagnostics", () => {
  it("preserves nested SDK validation reason and support reference", async () => {
    const sdk = { getPaymentToken: vi.fn().mockRejectedValue({code:"400", "exchange-id":"client-side-validation",
      payload:{error:{"error-message":"Individual Name is not valid", "result-code":"074"}}}) };
    await expect(getClearentAchPaymentToken(sdk)).rejects.toThrow("Individual Name is not valid Code: 400/074");
    await expect(getClearentAchPaymentToken(sdk)).rejects.toThrow("Support reference: client-side-validation");
  });
  it("handles JSON string rejections", () => {
    expect(describeClearentAchTokenError(JSON.stringify({code:"401",payload:{error:{"error-message":"Invalid Public Key"}}})))
      .toContain("Invalid Public Key Code: 401");
  });
  it("never includes bank fields or JWTs from the error object", () => {
    const result = describeClearentAchTokenError({code:"400",payload:{jwt:"eyJsecret.value.signature",accountNumber:"123456789",routingNumber:"987654321",
      error:{"error-message":"Account 123456789 token eyJsecret.value.signature rejected"}}});
    expect(result).not.toMatch(/123456789|987654321|eyJsecret/);
  });
  it("does not stringify unknown errors or sensitive support references", () => {
    const result = describeClearentAchTokenError({jwt:"secret", "exchange-id":"eyJsecret.value.signature"});
    expect(result).not.toContain("secret");
    expect(result).toContain("No debit request was sent");
  });
  it("returns a successful SDK result unchanged", async () => {
    const result={payload:{"ach-jwt":{jwt:"opaque-token"}}};
    expect(await getClearentAchPaymentToken({getPaymentToken:async()=>result})).toBe(result);
  });
});
