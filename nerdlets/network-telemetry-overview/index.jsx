import PropTypes from "prop-types";
import React from "react";
import ChordDiagram from "react-chord-diagram";
import { Dropdown, DropdownItem, NerdGraphQuery, Spinner } from "nr1";
import * as d3 from "d3";

const NERDGRAPH_NRQL_QUERY = `
query ($accountid:Int!, $nrql:Nrql!) {
  actor {
    account(id: $accountid) {
      nrql(query: $nrql, timeout: 10) {
        results
      }
    }
  }
}`;

const COLOR_START = "#11A893";
const COLOR_END = "#FFC400";

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
      isLoading: true,
      queryAttribute: "throughput",
      queryLimit: 50,
      relationships: [],
    };
  }

  componentDidMount() {
    this.fetchChordData();
  }

  componentDidUpdate(prevProps, prevState) {
    const { timeRange } = this.props.launcherUrlState;
    const { queryAttribute, queryLimit } = this.state;

    if (
      queryAttribute !== prevState.queryAttribute ||
      queryLimit !== prevState.queryLimit ||
      timeRange !== (prevProps.launcherUrlState || {}).timeRange
    ) {
      this.fetchChordData();
    }
  }

  /*
   * fetch data
   */
  async fetchChordData() {
    this.setState({ isLoading: true });
    const results = await NerdGraphQuery.query({
      query: NERDGRAPH_NRQL_QUERY,
      variables: {
        accountid: 1,
        nrql: this.createNrqlQuery(),
      },
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
      acc[s][t] = d["value"];

      return acc;
    }, []);

    const entityCount = entities.length;
    const colorFunc = this.colorForEntity(entityCount);

    let entityColors = [];
    let relationships = [];
    for (let y = 0; y < entityCount; y++) {
      entityColors.push(colorFunc(y));
      relationships[y] = [];
      for (let x = 0; x < entityCount; x++) {
        relationships[y][x] = (data[y] || [])[x] || 0;
      }
    }

    this.setState({
      entities,
      entityColors,
      isLoading: false,
      relationships,
    });
  }

  colorForEntity(entityCount) {
    return d3.scale
      .linear()
      .domain([1, entityCount])
      .interpolate(d3.interpolateHsl)
      .range([d3.rgb(COLOR_START), d3.rgb(COLOR_END)]);
  }

  createNrqlQuery() {
    const { queryAttribute, queryLimit } = this.state;

    let attr = "sum(scaledByteCount)";
    if (queryAttribute === "count") {
      attr = "count(*)";
    }

    return (
      "FROM sflow" +
      " SELECT " +
      attr +
      " as 'value'" +
      " FACET networkSourceAddress, networkDestinationAddress" +
      " LIMIT " +
      queryLimit +
      " " +
      this.timeRangeToNrql()
    );
  }

  handleAttributeChange(attr) {
    if (attr === "count" || attr === "throughput") {
      this.setState({ queryAttribute: attr });
    }
  }

  handleLimitChange(limit) {
    if (limit > 0 && limit <= 100) {
      this.setState({ queryLimit: limit });
    }
  }

  /*
   * Helper function to turn timeRange into NRQL Since
   */
  timeRangeToNrql() {
    const { timeRange } = this.props.launcherUrlState || {};

    if (!timeRange) {
      return "";
    } else if (timeRange.begin_time && timeRange.end_time) {
      return ` SINCE ${timeRange.begin_time} UNTIL ${timeRange.end_time}`;
    } else if (timeRange.duration) {
      return ` SINCE ${timeRange.duration / 1000} SECONDS AGO`;
    }

    return "";
  }

  render() {
    const { entities, entityColors, isLoading, relationships } = this.state;
    const width = 1000;
    const height = 700;
    const outerRadius = Math.min(height, width) * 0.5 - 100;
    const innerRadius = outerRadius - 10;

    return (
      <div>
        <Dropdown title='Line Visualization'>
          <DropdownItem onClick={() => this.handleAttributeChange("throughput")}>
            Throughput
          </DropdownItem>
          <DropdownItem onClick={() => this.handleAttributeChange("count")}>
            Flow Count
          </DropdownItem>
        </Dropdown>
        <Dropdown title='Entity Limit'>
          <DropdownItem onClick={() => this.handleLimitChange(25)}>25</DropdownItem>
          <DropdownItem onClick={() => this.handleLimitChange(50)}>50</DropdownItem>
          <DropdownItem onClick={() => this.handleLimitChange(100)}>100</DropdownItem>
        </Dropdown>
        {isLoading ? (
          <Spinner />
        ) : (
          <ChordDiagram
            componentId={1}
            groupColors={entityColors}
            groupLabels={entities}
            height={height}
            innerRadius={innerRadius}
            matrix={relationships}
            outerRadius={outerRadius}
            width={width}
          />
        )}
      </div>
    );
  }
}
