import nrdbQuery from "./nrdb-query";
import accountsWithData from "./accounts-with-data";

/**
 * look across all the accounts the user has access to, scoped to the provided
 * event type, and find any accounts that have a match on the provided where clause.
 * Useful for connecting entities/guids etc across account boundaries.
 *
 * As an optimization, we only query accounts that have event data of the provided type.
 * Beware that for customers with lots of accounts and a common event type (e.g. Transaction)
 * this could take a while. By default we use a short time window to keep queries light.
 *
 * Run account queries in parallel (limited by the browser's capacity for parallel requests)
 * and return the array of accounts, each with a hit count in descending order.
 */
export default async function findRelatedAccountsWith({ eventType, where, timeWindow }) {
  timeWindow = timeWindow || "SINCE 2 minutes ago";

  const accounts = await accountsWithData(eventType);
  const nrql = `SELECT count(*) FROM ${eventType} WHERE ${where} ${timeWindow}`;

  const result = [];
  await Promise.all(
    accounts.map(async account => {
      return await nrdbQuery(account.id, nrql).then(results => {
        const hitCount = results[0].count;
        if (hitCount > 0) {
          account.hitCount = hitCount;
          result.push(account);
        }
      });
    })
  );

  return result.sort((a, b) => b.hitCount - a.hitCount);
}
