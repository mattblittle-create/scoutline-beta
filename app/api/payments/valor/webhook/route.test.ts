import { beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import { NextRequest } from "next/server";
const mocks=vi.hoisted(()=>({success:vi.fn(),failure:vi.fn(),audit:vi.fn()}));
vi.mock("@/lib/payments/processPlayerPaymentWebhook",()=>({applySuccessfulPlayerPayment:mocks.success,applyFailedPlayerPayment:mocks.failure}));
vi.mock("@/lib/billing/billingAudit",()=>({createBillingAuditLog:mocks.audit}));
import {POST} from "./route";
const sale={txn_type:"SALE",txn_type_code:101,response_code:"00",txn_id:111,invoicenumber:"invoice-1",amount:100,custom_fee_amount:3,is_reversed:0,is_voided:0};
async function send(data:any, signed=true,event="TRANSACTION") {
 const body=JSON.stringify({event,data}); const timestamp=new Date().toISOString();
 const signature=crypto.createHmac("sha256","test-secret").update(body+timestamp).digest("hex");
 return POST(new NextRequest("https://example.com/webhook",{method:"POST",body,headers:signed?{"Valor-Timestamp":timestamp,"Valor-Signature":signature}:{}}));
}
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv("VALOR_WEBHOOK_SECRET","test-secret");vi.stubEnv("VALOR_WEBHOOK_ALLOW_UNSIGNED","true");mocks.success.mockResolvedValue({alreadyProcessed:false});vi.spyOn(console,"log").mockImplementation(()=>{});vi.spyOn(console,"warn").mockImplementation(()=>{});});
describe("Valor callback approval barrier",()=>{
 it("dispatches only a signed genuine sale to activation",async()=>{expect((await send(sale)).status).toBe(200);expect(mocks.success).toHaveBeenCalledTimes(1);expect(mocks.failure).not.toHaveBeenCalled();});
 it.each([{is_reversed:1},{is_voided:1},{status:"DECLINED"},{response_code:"05"},{display_message:"Address verification failed"}])("never activates failure %j despite success code",async override=>{await send({...sale,...override});expect(mocks.success).not.toHaveBeenCalled();expect(mocks.failure).toHaveBeenCalledTimes(1);});
 it.each([{status:"PENDING"},{txn_type:"AUTH"},{response_code:undefined,error_no:"S00"}])("leaves ambiguous %j untouched",async override=>{await send({...sale,...override});expect(mocks.success).not.toHaveBeenCalled();expect(mocks.failure).not.toHaveBeenCalled();});
 it("rejects unsigned callbacks even when legacy bypass is configured",async()=>{expect((await send(sale,false)).status).toBe(401);expect(mocks.success).not.toHaveBeenCalled();expect(mocks.failure).not.toHaveBeenCalled();});
 it("rejects missing transaction identity",async()=>{expect((await send({...sale,txn_id:null})).status).toBe(400);expect(mocks.success).not.toHaveBeenCalled();});
});
