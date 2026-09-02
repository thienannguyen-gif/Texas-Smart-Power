import { describe, expect, it } from "vitest";
import { readZip, toAreas } from "./zip-lookup.js";

describe("readZip", () => {
  it("accepts a 5-digit zip from an object body", () => {
    expect(readZip({ zip: "75201" })).toBe("75201");
  });

  it("accepts a stringified JSON body", () => {
    expect(readZip('{"zip":"77002"}')).toBe("77002");
  });

  it("rejects missing / wrong-length / non-string / non-numeric zips", () => {
    expect(readZip({})).toBeNull();
    expect(readZip({ zip: "7520" })).toBeNull();
    expect(readZip({ zip: "752011" })).toBeNull();
    expect(readZip({ zip: 75201 })).toBeNull();
    expect(readZip({ zip: "abcde" })).toBeNull();
    expect(readZip("not json")).toBeNull();
    expect(readZip(null)).toBeNull();
  });
});

describe("toAreas", () => {
  it("maps a known upstream company id to its TDU code", () => {
    expect(
      toAreas([
        { company_id: "ELSQL01DB1245281100006", company_name: "Oncor" },
      ]),
    ).toEqual([{ code: "oncor", name: "Oncor" }]);
  });

  it("drops unknown company ids", () => {
    expect(
      toAreas([
        { company_id: "UNKNOWN_ID", company_name: "Someone" },
        { company_id: "ELSQL01DB1245281100008", company_name: "TNMP" },
      ]),
    ).toEqual([{ code: "tnmp", name: "TNMP" }]);
  });

  it("dedupes repeated codes, keeping the first", () => {
    expect(
      toAreas([
        { company_id: "ELSQL01DB1245281100006", company_name: "Oncor A" },
        { company_id: "ELSQL01DB1245281100006", company_name: "Oncor B" },
      ]),
    ).toEqual([{ code: "oncor", name: "Oncor A" }]);
  });

  it("falls back to the code when the upstream name is missing or blank", () => {
    expect(toAreas([{ company_id: "ELSQL01DB1245538000024" }])).toEqual([
      { code: "lubbock", name: "lubbock" },
    ]);
    expect(
      toAreas([{ company_id: "ELSQL01DB1245281100002", company_name: "  " }]),
    ).toEqual([{ code: "aep-central", name: "aep-central" }]);
  });

  it("returns an empty list for an empty upstream response", () => {
    expect(toAreas([])).toEqual([]);
  });

  it("keeps two distinct areas for a split ZIP", () => {
    expect(
      toAreas([
        { company_id: "ELSQL01DB1245281100006", company_name: "Oncor" },
        { company_id: "ELSQL01DB1245281100008", company_name: "TNMP" },
      ]),
    ).toEqual([
      { code: "oncor", name: "Oncor" },
      { code: "tnmp", name: "TNMP" },
    ]);
  });
});
