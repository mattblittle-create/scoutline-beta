import {beforeEach,describe,expect,it,vi} from "vitest";
import {chargeValorStoredToken} from "./valorRecurringCharge";
beforeEach(()=>{vi.stubEnv("VALOR_RECURRING_CHARGES_ENABLED","true");vi.stubEnv("VALOR_APP_ID","app");vi.stubEnv("VALOR_APP_KEY","key");vi.stubEnv("VALOR_EPI","epi");});
describe("recurring card approval",()=>{
 it.each([{error_no:"S00"},{error_no:"S00",error_code:"00",msg:"APPROVED",is_reversed:1,txnid:"test"},{error_no:"S00",error_code:"00",msg:"DECLINED",txnid:"test"}])("never completes invalid result %j",async payload=>{vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json(payload)));expect((await chargeValorStoredToken({token:"test",invoiceNumber:"test",amountCents:100,description:"Test"})).ok).toBe(false);});
 it("completes only a true approved sale",async()=>{vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({error_no:"S00",error_code:"00",msg:"APPROVED",txnid:"test",is_reversed:0,is_voided:0})));expect(await chargeValorStoredToken({token:"test",invoiceNumber:"test",amountCents:100,description:"Test"})).toMatchObject({ok:true,status:"APPROVED",paymentCompleted:true,amountPaidCents:103});});
});
