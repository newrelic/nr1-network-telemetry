import * as d3 from "d3";

import { BlockText, Spinner } from "nr1";
import { COLOR_END, COLOR_START, NRQL_QUERY_LIMIT_DEFAULT } from "./constants";
import { Radio, RadioGroup } from "react-radio-group";
import { bitsToSize, intToSize } from "../../src/lib/bytes-to-size";

import ChordDiagram from "react-chord-diagram";
import PropTypes from "prop-types";
import React from "react";
import { Table } from "semantic-ui-react";
import { fetchNrqlResults } from "../../src/lib/nrql";
import { timeRangeToNrql } from "../../src/components/time-range";

export default class Sflow extends React.Component {
  static propTypes = {
    account: PropTypes.object.isRequired,
    configRenderer: PropTypes.func,
    height: PropTypes.number,
    launcherUrlState: PropTypes.object,
    queryLimit: PropTypes.number,
    summaryRenderer: PropTypes.func,
    timeRange: PropTypes.object.isRequired,
    width: PropTypes.number,
  };

  static defaultProps = {
    height: 650,
    queryLimit: NRQL_QUERY_LIMIT_DEFAULT,
    width: 700,
  };

  constructor(props) {
    super(props);

    this.state = {
      detailData: [],
      entities: [],
      isLoading: true,
      queryAttribute: "throughput",
      relationships: [],
      selectedEntity: null,
    };

    this.handleAttributeChange = this.handleAttributeChange.bind(this);
    this.handleChartGroupClick = this.handleChartGroupClick.bind(this);
  }

  componentDidMount() {
    this.fetchChordData();
  }

  componentDidUpdate(prevProps, prevState) {
    const { account, queryLimit, timeRange } = this.props;
    const { queryAttribute } = this.state;

    if (
      account !== prevProps.account ||
      queryAttribute !== prevState.queryAttribute ||
      queryLimit !== prevProps.queryLimit ||
      timeRange !== prevProps.timeRange
    ) {
      this.fetchChordData();
    }
  }

  /*
   * fetch data
   */
  async fetchChordData() {
    const { account } = this.props;

    if (!account || !account.id) return;

    this.setState({ detailData: [] });

    const results = await fetchNrqlResults(account.id, this.createNrqlQuery());

    const entities = [];
    const detailData = [];

    const data = results.reduce((acc, d) => {
      const source = d.facet[0];
      const target = d.facet[1];

      if (entities.indexOf(source) === -1) entities.push(source);
      const s = entities.indexOf(source);

      if (entities.indexOf(target) === -1) entities.push(target);
      const t = entities.indexOf(target);

      if (!Array.isArray(acc[s])) acc[s] = [];

      const value = d.value || 0;
      acc[s][t] = value;
      detailData.push({ source, target, value });

      return acc;
    }, []);

    const entityCount = entities.length;
    const colorFunc = this.colorForEntity(entityCount);

    const entityColors = [];
    const relationships = [];
    for (let y = 0; y < entityCount; y++) {
      entityColors.push(colorFunc(y));
      relationships[y] = [];
      for (let x = 0; x < entityCount; x++) {
        relationships[y][x] = (data[y] || [])[x] || 0;
      }
    }

    this.setState({
      detailData,
      entities,
      entityColors,
      isLoading: false,
      relationships,
    });
  }

  // Returns a FUNCTION that generates a color...
  colorForEntity(entityCount) {
    return d3.scale
      .linear()
      .domain([1, entityCount])
      .interpolate(d3.interpolateHsl)
      .range([d3.rgb(COLOR_START), d3.rgb(COLOR_END)]);
  }

  createNrqlQuery() {
    const { queryLimit } = this.props;
    const { queryAttribute } = this.state;

    let attr = "sum(scaledByteCount * 8)";
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
      timeRangeToNrql(this.props.launcherUrlState)
    );
  }

  handleAttributeChange(attr) {
    if (attr === "count" || attr === "throughput") {
      this.setState({ queryAttribute: attr });
    }
  }

  handleChartGroupClick(id) {
    const { entities, relationships, selectedEntity } = this.state;

    const newEntity = entities[id];

    // Unselect on repeated click
    if (newEntity === selectedEntity) {
      // all rows, all columns
      const detailData = relationships.flatMap(row =>
        row.reduce((acc, r, k) => {
          if (r !== 0) acc.push({ source: entities[k], target: newEntity, value: r });
          return acc;
        }, [])
      );
      this.setState({ detailData, selectedEntity: "" });
    } else {
      // id row, all columns
      const sourceIds = (relationships[id] || []).reduce((acc, r, k) => {
        if (r !== 0) acc.push({ source: entities[k], target: newEntity, value: r });
        return acc;
      }, []);

      // all rows, id column
      const targetIds = relationships.reduce((acc, r, k) => {
        if (r[id] !== 0) acc.push({ source: newEntity, target: entities[k], value: r[id] });
        return acc;
      }, []);

      this.setState({ detailData: [...targetIds, ...sourceIds], selectedEntity: newEntity });
    }
  }

  renderSideMenu() {
    const { queryAttribute } = this.state;

    return (
      <>
        <BlockText type={BlockText.TYPE.NORMAL}>
          <strong>Show devices with...</strong>
        </BlockText>
        <RadioGroup
          className='radio-group'
          name='attribute'
          onChange={this.handleAttributeChange}
          selectedValue={queryAttribute}
        >
          <div className='radio-option'>
            <Radio value='throughput' />
            <label htmlFor={"throughput"}>Highest Throughput</label>
          </div>
          <div className='radio-option'>
            <Radio value='count' />
            <label htmlFor={"count"}>Most flows collected</label>
          </div>
        </RadioGroup>
      </>
    );
  }

  render() {
    const { entities, entityColors, isLoading, relationships } = this.state;
    const width = 600;
    const height = 700;
    const outerRadius = Math.min(height, width) * 0.5 - 100;
    const innerRadius = outerRadius - 10;

    return (
      <div>
        {isLoading ? (
          <Spinner fillContainer />
        ) : entities.length < 1 ? (
          <div>No results found</div>
        ) : (
          <ChordDiagram
            componentId={1}
            groupColors={entityColors}
            groupLabels={entities}
            groupOnClick={this.handleChartGroupClick}
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

  renderFlowSummaryTable() {
    const { detailData, queryAttribute } = this.state;

    return (
      <Table compact striped>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell sorted='ascending'>source</Table.HeaderCell>
            <Table.HeaderCell>destination</Table.HeaderCell>
            <Table.HeaderCell>{queryAttribute}</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {detailData.map((r, k) => (
            <Table.Row key={k}>
              <Table.Cell>{r.source}</Table.Cell>
              <Table.Cell>{r.target}</Table.Cell>
              <Table.Cell>
                {queryAttribute === "throughput" ? bitsToSize(r.value) : intToSize(r.value)}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    );
  }

  renderDeviceInfo() {
    const { selectedEntity } = this.state;

    return <BlockText>TODO: Link {selectedEntity} back to an Entity via NetworkSample</BlockText>;
  }
}
