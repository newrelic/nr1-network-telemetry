import { NerdGraphQuery } from 'nr1';

// NerdGraph query wrapper for NRQL
export const NERDGRAPH_NRQL_QUERY = `
query ($accountid:Int!, $nrql:Nrql!) {
  actor {
    account(id: $accountid) {
      nrql(query: $nrql, timeout: 10) {
        results
      }
    }
  }
}`;

/*
 * Make an NRQL query through NerdGraph, return just the result json
 */
export const fetchNrqlResults = async (accountId, query) => {
  if (!accountId || !query) return;

  const results = await NerdGraphQuery.query({
    query: NERDGRAPH_NRQL_QUERY,
    variables: {
      accountid: accountId,
      nrql: query,
    },
  });

  return ((((results.data || {}).actor || {}).account || {}).nrql || {}).results || [];
};
