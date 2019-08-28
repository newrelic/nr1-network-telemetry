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
