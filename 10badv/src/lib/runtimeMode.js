const CLOSED_BETA_FLAG = (
  process.env.CLOSED_BETA_MODE === 'true'
  || process.env.NEXT_PUBLIC_CLOSED_BETA_MODE === 'true'
);
const REQUIRED_DATABASE_ENV = ['DATABASE_HOST', 'DATABASE_USER', 'DATABASE_NAME'];

function isDatabaseEnvMissing() {
  if (process.env.DATABASE_URL) {
    return false;
  }

  return REQUIRED_DATABASE_ENV.some((key) => !process.env[key]);
}

export function isClosedBetaMode() {
  if (process.env.NODE_ENV !== 'production') {
    return false;
  }

  return CLOSED_BETA_FLAG || isDatabaseEnvMissing();
}

export function isRuntimeReadOnlyMode() {
  return isClosedBetaMode();
}
