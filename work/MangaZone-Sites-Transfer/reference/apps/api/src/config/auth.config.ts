export const authConfig = () => ({
  password: {
    minLength: 15,
    maxLength: 128,
    argon2: {
      type: 2, // argon2id
      memoryCost: 19456, // 19 MiB
      timeCost: 2,
      parallelism: 1,
      hashLength: 32,
    },
  },
});
