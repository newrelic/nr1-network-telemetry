import { COLORS } from "./constants";
import { fetchNrqlResults } from "../../src/lib/nrql";

/*
 * Fetch some node /link stuff via NRQL
 *   should have a better name...
 */
export const fetchRelationshipFacets = async (accountId, nrqlQuery) => {
  const nodes = [];
  const links = [];

  if (accountId && nrqlQuery) {
    const results = await fetchNrqlResults(accountId, nrqlQuery);

    results.forEach(row => {
      // Collect nodes
      const ids = (row.facet || []).map(f => {
        const id = nodes.findIndex(node => node.name === f);
        if (id < 0)
          return (
            nodes.push({
              color: COLORS[nodes.length % COLORS.length],
              name: f,
              value: 0
            }) - 1
          );

        return id;
      });

      const value = row.value;
      // Sum all from this source
      nodes[ids[0]].value += value;

      // Update existing links (0 => 1 => 2 etc)
      for (let x = 0; x < ids.length - 1; x++) {
        const sa = links.findIndex(
          link => link.source === ids[x] && link.target === ids[x + 1]
        );
        if (sa >= 0) {
          links[sa].value += value;
        } else {
          links.push({
            color: nodes[ids[0]].color,
            source: ids[x],
            sourceId: ids[0],
            target: ids[x + 1],
            value
          });
        }
      }
    });
  }

  return { links, nodes };
};
