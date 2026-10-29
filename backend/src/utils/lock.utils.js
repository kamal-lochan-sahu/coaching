// Runs jobs that share a key ONE AFTER ANOTHER instead of at the same time.
//
// Used where a double click (or two staff members acting at the same moment) would otherwise pass the
// same "does it already exist?" check twice and create the record twice — e.g. collecting the same
// student's fee for the same month.
//
// It works inside ONE server process, which is how this app runs (a single Render instance). If it is
// ever scaled to several instances, back it with a database unique index as well.

const tails = new Map();

export const withLock = async (key, fn) => {
  const previous = tails.get(key) || Promise.resolve();
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const tail = previous.then(() => gate);   // `previous` never rejects: every gate resolves in `finally`
  tails.set(key, tail);
  try {
    await previous;
    return await fn();
  } finally {
    release();
    if (tails.get(key) === tail) tails.delete(key);   // nobody queued behind us — free the memory
  }
};
