import { describe, it, expect } from "vitest";
import {
  isWebSerialSupported,
  isWebUSBSupported,
} from "../../src/utils/browser-support.js";

describe("browser-support", () => {
  const mutableNavigator = globalThis.navigator as unknown as {
    serial?: Navigator["serial"];
    usb?: Navigator["usb"];
  };

  it("should detect Web Serial API support", () => {
    expect(isWebSerialSupported()).toBe(true);
  });

  it("should detect WebUSB API support", () => {
    expect(isWebUSBSupported()).toBe(true);
  });

  it("should handle missing Web Serial API gracefully", () => {
    const originalSerial = globalThis.navigator.serial;
    delete mutableNavigator.serial;

    expect(isWebSerialSupported()).toBe(false);

    // Restore
    mutableNavigator.serial = originalSerial;
  });

  it("should handle missing WebUSB API gracefully", () => {
    const originalUSB = globalThis.navigator.usb;
    delete mutableNavigator.usb;

    expect(isWebUSBSupported()).toBe(false);

    // Restore
    mutableNavigator.usb = originalUSB;
  });
});
