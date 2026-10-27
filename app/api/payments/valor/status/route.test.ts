import {beforeEach,describe,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
const m=vi.hoisted(()=>({user:vi.fn(),find:vi.fn()}));
vi.mock("@/lib/auth/getCurrentUser",()=>({getCurrentUser:m.user}));
vi.mock("@/lib/prisma",()=>({prisma:{playerInvoice:{findFirst:m.find}}}));
import {GET} from "./route";
const request=()=>new NextRequest("https://example.com/status?reference=invoice-1&payment=success");
beforeEach(()=>{vi.resetAllMocks();m.user.mockResolvedValue({id:"owner"});});
describe("customer payment truth and retry permission",()=>{
 it("requires sign-in",async()=>{m.user.mockResolvedValue(null);expect((await GET(request())).status).toBe(401);expect(m.find).not.toHaveBeenCalled();});
 it("restricts the lookup to the current owner",async()=>{m.find.mockResolvedValue(null);expect((await GET(request())).status).toBe(404);expect(m.find).toHaveBeenCalledWith(expect.objectContaining({where:{externalId:"invoice-1",playerProfile:{userId:"owner"}}}));});
 it("rejects forged success URL state and exposes reversal with manual retry",async()=>{m.find.mockResolvedValue({status:"PAST_DUE",amountPaidCents:0,processorResponseCode:"REVERSED"});expect(await(await GET(request())).json()).toMatchObject({state:"failed",canRetry:true,message:expect.stringContaining("ZIP")});});
 it("does not permit retry while outcome is ambiguous",async()=>{m.find.mockResolvedValue({status:"OPEN",amountPaidCents:0});expect(await(await GET(request())).json()).toMatchObject({state:"pending",canRetry:false});});
 it("confirms recorded approved payment without permitting another payment",async()=>{m.find.mockResolvedValue({status:"PAID",amountPaidCents:103,processorResponseCode:"APPROVED"});expect(await(await GET(request())).json()).toMatchObject({state:"success",canRetry:false});});
});

it.each([{fee:0,paid:100},{fee:3,paid:103}])("returns invoice-specific confirmed amounts for fee $fee",async({fee,paid})=>{
 m.find.mockResolvedValue({status:"PAID",amountCents:100,cardFeeCents:fee,amountPaidCents:paid,processorResponseCode:"APPROVED"});
 expect(await(await GET(request())).json()).toMatchObject({state:"success",payment:{subtotalCents:100,feeCents:fee,totalCents:paid,paidCents:paid}});
});
it("does not expose an estimate as a confirmed pending payment",async()=>{
 m.find.mockResolvedValue({status:"OPEN",amountCents:100,cardFeeCents:0,amountPaidCents:0});
 expect(await(await GET(request())).json()).toMatchObject({state:"pending",payment:null});
});
it("returns zero currently paid after a debit void",async()=>{
 m.find.mockResolvedValue({status:"VOID",amountCents:100,cardFeeCents:0,amountPaidCents:0,processorResponseCode:"VOIDED"});
 expect(await(await GET(request())).json()).toMatchObject({state:"failed",canRetry:true,payment:{feeCents:0,paidCents:0}});
});
