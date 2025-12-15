import { expect, test } from "vitest";
import type { PortInfo } from "@serialport/bindings-cpp";
import { filterInterestingPorts } from "./serial_devices";

test("if just manufacturer is populated, returns true", () => {
    const a: PortInfo = {
        path: "ttc",
        manufacturer: "hi",
        serialNumber: undefined,
        pnpId: undefined,
        locationId: undefined,
        productId: undefined,
        vendorId: undefined
    };
  expect(filterInterestingPorts(a)).toBeTruthy();
});

test("if just serialNumber is populated, returns true", () => {
  const a: PortInfo = {
    path: "ttc",
    manufacturer: undefined,
    serialNumber: "sn",
    pnpId: undefined,
    locationId: undefined,
    productId: undefined,
    vendorId: undefined,
  };
  expect(filterInterestingPorts(a)).toBeTruthy();
});


test("if all fields are populated, returns true", () => {
  const a: PortInfo = {
    path: "ttc",
    manufacturer: "mn",
    serialNumber: "sn",
    pnpId: "pnpId",
    locationId: "locationId",
    productId: "productId",
    vendorId: "vendorId",
  };
  expect(filterInterestingPorts(a)).toBeTruthy();
});


test("if none of the fields is populated, returns true", () => {
  const a: PortInfo = {
    path: "ttc",
    manufacturer: undefined,
    serialNumber: undefined,
    pnpId: undefined,
    locationId: undefined,
    productId: undefined,
    vendorId: undefined,
  };
  expect(filterInterestingPorts(a)).toBeFalsy();
});