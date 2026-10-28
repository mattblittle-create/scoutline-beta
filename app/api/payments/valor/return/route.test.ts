import {beforeEach,describe,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
const m=vi.hoisted(()=>({find:vi.fn(),update:vi.fn()}));
vi.mock("@prisma/client",async original=>{const actual=await original<typeof import("@prisma/client")>();return {...actual,PrismaClient:class {playerInvoice={findFirst:m.find};playerProfile={update:m.update};}};});
import {GET} from "./route";
beforeEach(()=>vi.resetAllMocks());
describe("Valor browser return is display-only",()=>{
 it("recognizes failure=1 without writing account state",async()=>{m.find.mockResolvedValue({status:"OPEN",playerProfileId:"profile"});const response=await GET(new NextRequest("https://example.com/return?ref=test&failure=1"));expect(response.headers.get("location")).toContain("payment=failed");expect(m.update).not.toHaveBeenCalled();});
 it("cannot approve from success=1",async()=>{m.find.mockResolvedValue({status:"OPEN",playerProfileId:"profile"});const response=await GET(new NextRequest("https://example.com/return?ref=test&success=1"));expect(response.headers.get("location")).toContain("payment=processing");expect(m.update).not.toHaveBeenCalled();});
 it("shows a recorded reversal as failed despite stale paid state",async()=>{m.find.mockResolvedValue({status:"PAID",processorResponseCode:"REVERSED",playerProfileId:"profile"});const response=await GET(new NextRequest("https://example.com/return?ref=test"));expect(response.headers.get("location")).toContain("payment=failed");expect(m.update).not.toHaveBeenCalled();});
});
