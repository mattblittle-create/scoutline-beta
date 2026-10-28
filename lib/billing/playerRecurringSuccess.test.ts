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

it("keeps the scheduled 28th after a late recurring payment",async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date("2027-03-01T15:00:00Z"));
 const create=vi.fn(),update=vi.fn();
 transaction.mockImplementation(async fn=>fn({playerInvoice:{findUnique:async()=>({id:"test",playerProfileId:"profile",cadence:"monthly",status:"PAST_DUE",dueDate:new Date("2027-02-28T15:00:00Z"),amountCents:100,cardFeeCents:3}),update,findFirst:async()=>null,create},playerProfile:{update}}));
 try {
  await markPlayerRecurringPaymentSucceeded({invoiceId:"test",amountPaidCents:103,cardFeeCents:3,processorTransactionId:"txn-new",paymentStatus:"APPROVED",paymentCompleted:true});
  expect(create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({dueDate:new Date("2027-03-28T14:00:00Z")})}));
 } finally {vi.useRealTimers();}
});
