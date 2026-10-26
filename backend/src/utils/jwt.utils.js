import crypto from "crypto";
import jwt from "jsonwebtoken";

const ALGORITHM = "HS256";

// Called once at startup (server.js): fail fast with a clear message instead of
// a cryptic "secretOrPrivateKey must have a value" the first time someone logs in.
export const validateAuthEnv = () => {
  const missing = ["JWT_SECRET", "REFRESH_TOKEN_SECRET"].filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Missing required environment variable(s): ${missing.join(", ")}`);
  if (process.env.JWT_SECRET === process.env.REFRESH_TOKEN_SECRET) {
    console.warn("⚠️  JWT_SECRET and REFRESH_TOKEN_SECRET are identical — use two different secrets");
  }
  if (process.env.JWT_SECRET.length < 32 || process.env.REFRESH_TOKEN_SECRET.length < 32) {
    console.warn("⚠️  JWT secrets should be at least 32 characters long");
  }
};

// Every token carries a `type`, so a refresh token can never be used as an access token
// (or the other way round) — even if both secrets were accidentally set to the same value.
const sign = (payload, secret, expiresIn, type, extra = {}) =>
  jwt.sign({ ...payload, type }, secret, { expiresIn, algorithm: ALGORITHM, ...extra });

// Tokens issued BEFORE the `type` claim existed have no `type`. They are still accepted so
// nobody is logged out by this update; they all expire within 7 days of the deploy.
const verify = (token, secret, expectedType) => {
  const decoded = jwt.verify(token, secret, { algorithms: [ALGORITHM] });
  if (decoded.type && decoded.type !== expectedType) throw new jwt.JsonWebTokenError("wrong token type");
  return decoded;
};

export const generateAccessToken = (payload) =>
  sign(payload, process.env.JWT_SECRET, process.env.JWT_EXPIRY || "15m", "access");

export const generateRefreshToken = (payload) =>
  // jwtid makes every refresh token unique — two logins in the same second must not produce the same token
  sign(payload, process.env.REFRESH_TOKEN_SECRET, process.env.REFRESH_TOKEN_EXPIRY || "7d", "refresh", { jwtid: crypto.randomUUID() });

export const verifyAccessToken = (token) =>
  verify(token, process.env.JWT_SECRET, "access");

export const verifyRefreshToken = (token) =>
  verify(token, process.env.REFRESH_TOKEN_SECRET, "refresh");

export const generateTokenPair = (userId, role, ownerId) => {
  const payload = { userId, role, ownerId };
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

// Refresh tokens are stored hashed (see models/Session.js) — never in plain text.
export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Expiry of a token we just signed, as a Date (used for the Session TTL).
export const getTokenExpiry = (token) => new Date(jwt.decode(token).exp * 1000);
