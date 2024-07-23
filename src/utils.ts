import { Status } from "./types";

export const reflect = (promise: Promise<Status>) => {
  return promise.then(
    (v) => {
      return { status: "fulfilled", value: v };
    },
    (error) => {
      return { status: "rejected", reason: error };
    }
  );
};

export const timer = (duration: number) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, duration);
  });
};
