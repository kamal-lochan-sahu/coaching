import Redis from "ioredis";

let redisClient = null;

export const connectRedis = async () => {
  if (!process.env.REDIS_URL || process.env.REDIS_URL.includes("<password>")) {
    console.warn("⚠️  Redis URL not configured — caching disabled");
    return;
  }

  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 1000);
      },
    });

    redisClient.on("connect", () => console.log("✅ Redis Connected (Upstash)"));
    redisClient.on("error", (err) => console.error(`❌ Redis error: ${err.message}`));

    await redisClient.ping();
  } catch (error) {
    console.error(`❌ Redis connection failed: ${error.message}`);
    console.warn("⚠️  App will run without caching");
    // Don't leave a half-dead client behind — stop it from retrying/logging forever.
    try { redisClient?.disconnect(); } catch {}
    redisClient = null;
  }
};

export const disconnectRedis = async () => {
  if (!redisClient) return;
  try { await redisClient.quit(); } catch { try { redisClient.disconnect(); } catch {} }
  redisClient = null;
};

export const TTL = {
  SHORT:  60,
  MEDIUM: 300,
  LONG:   1800,
  DAY:    86400,
};

export const cacheGet = async (key) => {
  if (!redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
};

export const cacheSet = async (key, value, ttl = TTL.MEDIUM) => {
  if (!redisClient) return;
  try { await redisClient.setex(key, ttl, JSON.stringify(value)); } catch {}
};

export const cacheDelete = async (...keys) => {
  if (!redisClient || keys.length === 0) return;
  try { await redisClient.del(...keys); } catch {}
};

// ✅ Cache invalidation helpers — call after any mutation that changes
// the numbers shown on the dashboard or revenue chart.
export const invalidateDashboardCache = (ownerId) => cacheDelete(`dashboard:${ownerId}`);
export const invalidateRevenueCache   = (ownerId) => cacheDelete(`revenue:${ownerId}`);

export { redisClient };
