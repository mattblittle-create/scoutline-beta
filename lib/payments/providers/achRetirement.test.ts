import {describe,it,expect,vi} from "vitest";
import {clearentAchProvider} from "./clearentAchProvider";
describe("ACH retirement",()=>{
 it("does not submit initial or recurring debits",async()=>{
  const fetchMock=vi.fn();vi.stubGlobal("fetch",fetchMock);
  try {
   expect(await clearentAchProvider.createInitialAchDebit!({reference:"test",mobileJwt:"opaque",amountCents:100,accountType:"Checking",individualName:"Test",standardEntryClassCode:"WEB",softwareType:"test",softwareTypeVersion:"1"})).toMatchObject({ok:false,code:"ACH_RETIRED"});
   expect(await clearentAchProvider.chargeStoredMethod!({token:"opaque",invoiceNumber:"test",amountCents:100,description:"Test"})).toMatchObject({ok:false,skipped:true});
   expect(fetchMock).not.toHaveBeenCalled();
  } finally {vi.unstubAllGlobals();}
 });
});
