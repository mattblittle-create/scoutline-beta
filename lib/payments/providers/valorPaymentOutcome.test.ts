import { describe, expect, it } from "vitest";
import { getValorPaymentOutcome } from "./valorPaymentOutcome";
const sale = { txn_type: "SALE", txn_type_code: 101, response_code: "00", is_reversed: 0, is_voided: 0 };
describe("Valor definitive sale outcome", () => {
 it("accepts a genuine approved non-reversed sale", () => expect(getValorPaymentOutcome({ event: "TRANSACTION", data: sale }).approved).toBe(true));
 it.each([true, 1, "1", "true"])("reversal flag %s beats code 00", is_reversed => {
  expect(getValorPaymentOutcome({data:{...sale,is_reversed}})).toMatchObject({status:"REVERSED",approved:false,definitiveFailure:true});
 });
 it.each([
  {is_voided:1}, {txn_type:"CREDIT REVERSAL"}, {status:"DECLINED"}, {status:"PENDING"},
  {status:"UNKNOWN"}, {status:"FAILED"}, {status:"APPROVED",error_code:"05"},
  {response_code:"05"}, {display_message:"Address verification failed"}, {is_reversed:"unknown"},
  {txn_type:"AUTH"}, {txn_type:"REFUND"}, {txn_type_code:108},
 ])("never approves contradictory or non-sale state %j", override => {
  expect(getValorPaymentOutcome({data:{...sale,...override}}).approved).toBe(false);
 });
 it.each([{}, {error_no:"S00"}, {status:"OK"}, {txn_type:"SALE"}])("rejects ambiguous transport-only result %j", data => {
  expect(getValorPaymentOutcome({data}).approved).toBe(false);
 });
 it.each(["TRANSACTION FAILED","AUTHDECLINED","CREDIT REVERSAL","TRANSACTION VOIDED"])("negative event %s beats positive fields", event => {
  expect(getValorPaymentOutcome({event,data:{...sale,status:"APPROVED"}}).approved).toBe(false);
 });
});
