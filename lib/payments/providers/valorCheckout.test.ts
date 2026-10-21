import {beforeEach,describe,expect,it,vi} from "vitest";
import {createValorCheckout} from "./valorCheckout";
const input={reference:"test-1",amountCents:100,surchargeCents:3,description:"Test",customerName:"Test",successUrl:"https://example.com/success",failureUrl:"https://example.com/failed",redirectUrl:"https://example.com/return"};
beforeEach(()=>{vi.stubEnv("VALOR_APP_ID","test-app");vi.stubEnv("VALOR_APP_KEY","test-key");vi.stubEnv("VALOR_EPI","test-epi");vi.stubEnv("VALOR_HPP_BASE_URL","https://securelink.valorpaytech.com/?pagesale");});
describe("safe hosted card checkout",()=>{
 it("returns the provider-created form without exposing merchant credentials",async()=>{vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({error_no:"S00",url:"https://securelink-prod.valorpaytech.com/?uid=test"})));const result=await createValorCheckout(input);expect(result.checkoutUrl).toBe("https://securelink-prod.valorpaytech.com/?uid=test");expect(result.checkoutUrl).not.toContain("appkey");});
 it.each([{error_no:"S00"},{error_no:"ERR",url:"https://securelink-prod.valorpaytech.com/?uid=test"},{error_no:"S00",url:"https://evil.example.com/"}])("fails closed on invalid creation response %j",async payload=>{vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json(payload)));expect((await createValorCheckout(input)).ok).toBe(false);});
});
