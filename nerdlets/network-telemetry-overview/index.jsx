import PropTypes from "prop-types";
import React from "react";
import ChordDiagram from "react-chord-diagram";
import { NerdGraphQuery } from "nr1";

const OverviewFacetQuery = `
query ($accountid:Int!) {
  actor {
    account(id: $accountid) {
      nrql(query: "FROM sflow SELECT sum(scaledByteCount) FACET networkSourceAddress, networkDestinationAddress LIMIT 150") {
        results
      }
    }
  }
}`;

export default class MyNerdlet extends React.Component {
  static propTypes = {
    height: PropTypes.number,
    launcherUrlState: PropTypes.object,
    nerdletUrlState: PropTypes.object,
    width: PropTypes.number,
  };

  constructor(props) {
    super(props);

    this.state = {
      entities: [],
      relationships: [],
    };
  }

  async componentDidMount() {
    const results = await NerdGraphQuery.query({
      query: OverviewFacetQuery,
      variables: { accountid: 1 },
    });

    let entities = [];

    const data = (
      ((((results.data || {}).actor || {}).account || {}).nrql || {}).results || []
    ).reduce((acc, d) => {
      const source = d.facet[0];
      const target = d.facet[1];

      if (entities.indexOf(source) === -1) {
        entities.push(source);
      }
      const s = entities.indexOf(source);

      if (entities.indexOf(target) === -1) {
        entities.push(target);
      }
      const t = entities.indexOf(target);

      if (!Array.isArray(acc[s])) {
        acc[s] = [];
      }
      acc[s][t] = d["sum.scaledByteCount"];

      return acc;
    }, []);

    const entityCount = entities.length;

    let relationships = [];
    for (let y = 0; y < entityCount; y++) {
      relationships[y] = [];
      for (let x = 0; x < entityCount; x++) {
        relationships[y][x] = (data[y] || [])[x] || 0;
      }
    }

    this.setState({
      entities,
      relationships,
    });
  }

  render() {
    const { entities, relationships } = this.state;

    return (
      <ChordDiagram
        matrix={relationships}
        componentId={1}
        groupLabels={entities}
        //groupColors={["#000000", "#FFDD89", "#957244", "#F26223"]}
        width={1000}
      />
    );
  }
}
