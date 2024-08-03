import { reflect, timer } from "../src/utils";
import { Status, StatusFulfilled, StatusRejected } from "../src/types";

describe("Utils.ts", () => {
  describe("reflect", () => {
    it("should return a fulfilled status and value when promise resolves", async () => {
      const status: Status = {
        status: "success",
        value: "test",
        reason: new Error("failure"),
      };
      const promise: Promise<Status> = Promise.resolve(status);
      const result: StatusFulfilled | StatusRejected = await reflect(promise);
      expect(result).toEqual({ status: "fulfilled", value: "test" });
    });

    it("should return a rejected status and error when promise rejects", async () => {
      const status: Status = {
        status: "failure",
        value: "test",
        reason: new Error("failure"),
      };
      const promise: Promise<Status> = Promise.reject(status.reason);
      const result: StatusFulfilled | StatusRejected = await reflect(promise);
      expect(result).toEqual({
        status: "rejected",
        reason: new Error("failure"),
      });
    });
  });

  describe("timer", () => {
    it("should resolve after the specified duration", async () => {
      const duration = 1000;
      const start: number = Date.now();
      await timer(duration);
      const end: number = Date.now();
      const elapsed: number = end - start;
      expect(elapsed).toBeGreaterThanOrEqual(duration);
    });
  });
});
