import {expect,it,vi} from "vitest";
const transaction=vi.hoisted(()=>vi.fn());
vi.mock("@/lib/prisma",()=>({prisma:{$transaction:transaction}}));
import {markPlayerRecurringPaymentSucceeded} from "./playerRecurringSuccess";
it("refuses a direct unconfirmed paid-state write without touching billing",async()=>{
 await expect(markPlayerRecurringPaymentSucceeded({invoiceId:"test",amountPaidCents:103,processorTransactionId:"test"})).rejects.toThrow("unconfirmed");
 expect(transaction).not.toHaveBeenCalled();
});

it("refuses stale approved recurring results after the same transaction reversed",async()=>{
 transaction.mockImplementation(async fn=>fn({playerInvoice:{findUnique:async()=>({id:"test",processorResponseCode:"REVERSED",processorTransactionId:"txn-old"})}}));
 await expect(markPlayerRecurringPaymentSucceeded({invoiceId:"test",amountPaidCents:103,processorTransactionId:"txn-old",paymentStatus:"APPROVED",paymentCompleted:true})).rejects.toThrow("reactivate");
});
