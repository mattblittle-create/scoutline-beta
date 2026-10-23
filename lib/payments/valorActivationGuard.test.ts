import { beforeEach, describe, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>({transaction:vi.fn(),find:vi.fn(),update:vi.fn(),updateMany:vi.fn(),create:vi.fn(),profile:vi.fn(),billing:vi.fn(),audit:vi.fn()}));
vi.mock("@/lib/prisma",()=>({prisma:{$transaction:m.transaction}}));
vi.mock("@/lib/billing/billingAudit",()=>({createBillingAuditLog:m.audit}));
import {applySuccessfulPlayerPayment,applyFailedPlayerPayment} from "./processPlayerPaymentWebhook";
import {normalizeValorWebhook} from "./providers/valorWebhook";
const raw={event:"TRANSACTION",data:{txn_type:"SALE",response_code:"00",txn_id:"txn-1",invoice_no:"invoice-1",amount:100,custom_fee_amount:3,is_reversed:0,is_voided:0}};
const base={id:"invoice-1",externalId:"invoice-1",playerProfileId:"profile-1",status:"OPEN",amountCents:100,cardFeeCents:3,processorTransactionId:null,processorResponseCode:null,createdAt:new Date(),cadence:"monthly",playerProfile:{userId:null,playerPlanTier:"WALK_ON"}};
beforeEach(()=>{vi.resetAllMocks();m.transaction.mockImplementation(async fn=>fn({playerInvoice:{findFirst:m.find,update:m.update,updateMany:m.updateMany,create:m.create},playerProfile:{update:m.profile},playerBillingProfile:{upsert:m.billing,updateMany:m.billing}}));m.find.mockResolvedValue(base);});
function noActivation(){expect(m.create).not.toHaveBeenCalled();expect(m.profile).not.toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({hasActivePlayerBilling:true})}));expect(m.billing).not.toHaveBeenCalledWith(expect.objectContaining({create:expect.anything()}));}
describe("Valor invoice activation invariants",()=>{
 it("rejects a reversal at the paid-state writer even if caller sets approved=true",async()=>{const normalized=normalizeValorWebhook({...raw,data:{...raw.data,is_reversed:1}});normalized.approved=true;await expect(applySuccessfulPlayerPayment({provider:"VALOR",normalized})).rejects.toThrow("unapproved");expect(m.transaction).not.toHaveBeenCalled();noActivation();});
 it("does not reactivate a reconciled/reversed transaction on stale approval",async()=>{m.find.mockResolvedValue({...base,status:"PAST_DUE",processorResponseCode:"REVERSED",processorTransactionId:"txn-1"});await applySuccessfulPlayerPayment({provider:"VALOR",normalized:normalizeValorWebhook(raw)});expect(m.update).not.toHaveBeenCalled();noActivation();});
 it("rejects a mismatched amount before paid state or renewal creation",async()=>{await expect(applySuccessfulPlayerPayment({provider:"VALOR",normalized:normalizeValorWebhook({...raw,data:{...raw.data,amount:200}})})).rejects.toThrow("amount");expect(m.update).not.toHaveBeenCalled();noActivation();});
 it("creates recurring state only for a matching genuine approval",async()=>{m.find.mockResolvedValueOnce(base).mockResolvedValueOnce(null);await applySuccessfulPlayerPayment({provider:"VALOR",normalized:normalizeValorWebhook(raw)});expect(m.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({status:"PAID",amountPaidCents:103})}));expect(m.create).toHaveBeenCalledTimes(1);expect(m.transaction).toHaveBeenCalledWith(expect.any(Function),{isolationLevel:"Serializable"});});
 it("rolls back paid state and removes future renewals on a matching reversal",async()=>{m.find.mockResolvedValueOnce({...base,status:"PAID",processorTransactionId:"txn-1"}).mockResolvedValueOnce(null);await applyFailedPlayerPayment({provider:"VALOR",normalized:normalizeValorWebhook({...raw,data:{...raw.data,is_reversed:1}})});expect(m.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({amountPaidCents:0,paidAt:null,status:"PAST_DUE"})}));expect(m.updateMany).toHaveBeenCalledWith(expect.objectContaining({data:{status:"VOID"}}));expect(m.billing).toHaveBeenCalledWith(expect.objectContaining({data:{providerPaymentRef:null}}));noActivation();});
 it("ignores failure for another transaction on a paid invoice",async()=>{m.find.mockResolvedValue({...base,status:"PAID",processorTransactionId:"newer-txn"});await applyFailedPlayerPayment({provider:"VALOR",normalized:normalizeValorWebhook({...raw,data:{...raw.data,is_reversed:1}})});expect(m.update).not.toHaveBeenCalled();expect(m.updateMany).not.toHaveBeenCalled();noActivation();});
});

describe("provider-confirmed debit pricing", () => {
 it("accepts an approved fee-free debit against a credit estimate and carries zero to renewal", async () => {
  m.find.mockResolvedValueOnce(base).mockResolvedValueOnce(null);
  await applySuccessfulPlayerPayment({provider:"VALOR",normalized:normalizeValorWebhook({...raw,data:{...raw.data,card_metadata:{card_type:"DEBIT"},custom_fee_amount:0}})});
  expect(m.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({status:"PAID",amountPaidCents:100,cardFeeCents:0})}));
  expect(m.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({cardFeeCents:0,amountCents:100})}));
  expect(m.billing).toHaveBeenCalledWith(expect.objectContaining({update:expect.objectContaining({paymentType:"DEBIT"})}));
 });
 it("uses zero for a confirmed debit even when the provider omits its zero fee", async () => {
  m.find.mockResolvedValueOnce(base).mockResolvedValueOnce(null);
  await applySuccessfulPlayerPayment({provider:"VALOR",normalized:normalizeValorWebhook({...raw,data:{...raw.data,card_type:"DEBIT",custom_fee_amount:undefined}})});
  expect(m.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({amountPaidCents:100,cardFeeCents:0})}));
 });
 it("rejects a nonzero debit surcharge", async () => {
  await expect(applySuccessfulPlayerPayment({provider:"VALOR",normalized:normalizeValorWebhook({...raw,data:{...raw.data,card_type:"DEBIT"}})})).rejects.toThrow("amount");
  expect(m.update).not.toHaveBeenCalled();noActivation();
 });
 it("uses verified credit fee when a customer selected a debit estimate", async () => {
  m.find.mockResolvedValueOnce({...base,cardFeeCents:0}).mockResolvedValueOnce(null);
  await applySuccessfulPlayerPayment({provider:"VALOR",normalized:normalizeValorWebhook({...raw,data:{...raw.data,card_type:"CREDIT"}})});
  expect(m.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({amountPaidCents:103,cardFeeCents:3})}));
 });
 it("does not waive a credit fee solely because the invoice estimated zero", async () => {
  m.find.mockResolvedValue({...base,cardFeeCents:0});
  await expect(applySuccessfulPlayerPayment({provider:"VALOR",normalized:normalizeValorWebhook({...raw,data:{...raw.data,card_type:"CREDIT",custom_fee_amount:0}})})).rejects.toThrow("amount");noActivation();
 });
});
