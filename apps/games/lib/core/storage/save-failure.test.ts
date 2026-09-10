import { afterEach, describe, expect, it, vi } from "vitest";
import { saveSrsAndRecord, loadSrsState } from "./srs";
import { createInitialState, reviewCard } from "../fsrs";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("저장 실패 격리 — 실제 Storage 대신 오류를 주입", () => {
 for(const failed of ["srs", "streak", "activity", "all"]) {
  it(`${failed} 저장 실패를 기록하고 이후 정상 저장이 복구된다`, () => {
   const map=new Map<string,string>();let reject=true;
   vi.stubGlobal("window",{localStorage:{
    get length(){return map.size;},key:(i:number)=>[...map.keys()][i]??null,
    getItem:(k:string)=>map.get(k)??null,
    setItem:(k:string,v:string)=>{if(reject&&(failed==="all"||k.includes(`:${failed}`)))throw new Error("storage unavailable");map.set(k,v);},
    removeItem:(k:string)=>map.delete(k),
   }});
   const warn=vi.spyOn(console,"warn").mockImplementation(()=>{});
   const state=reviewCard(createInitialState(),"good");
   expect(()=>saveSrsAndRecord("fixture-game","fixture-card",state)).not.toThrow();
   expect(warn).toHaveBeenCalledWith(expect.any(String),expect.objectContaining({
    srsOk:failed!=="srs"&&failed!=="all",streakOk:failed!=="streak"&&failed!=="all",activityOk:failed!=="activity"&&failed!=="all",
   }));
   reject=false;warn.mockClear();saveSrsAndRecord("fixture-game","fixture-card",state);
   expect(warn).not.toHaveBeenCalled();expect(loadSrsState("fixture-game","fixture-card").reviewCount).toBe(1);
  });
 }
});
