/** Allow JSON.stringify on Prisma BigInt fields */
export function patchBigIntJson() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}
