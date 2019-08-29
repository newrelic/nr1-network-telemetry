import PropTypes from "prop-types";
import React from "react";
import ChordDiagram from "react-chord-diagram";
import { AccountDropdown } from "nr1-commune";
import { Table } from "semantic-ui-react";
import { bitsToSize, intToSize } from "../../src/lib/bytes-to-size";
import { timeRangeToNrql } from "nr1-commune";
import {
  BlockText,
  Tabs,
  TabsItem,
  Icon,
  List,
  ListItem,
  Grid,
  GridItem,
  HeadingText,
  Spinner,
} from "nr1";
import { RadioGroup, Radio } from "react-radio-group";
import { fetchNrqlResults } from "../../src/lib/nrql";
import { renderDeviceHeader } from "./common";

import * as d3 from "d3";

const COLOR_START = "#11A893";
const COLOR_END = "#FFC400";

export default class Sflow extends React.Component {
  static propTypes = {
    account: PropTypes.object.isRequired,
    timeRange: PropTypes.object.isRequired,
    height: PropTypes.number,
    width: PropTypes.number,
  };

  static defaultProps = {
    height: 650,
    width: 700,
  };

  constructor(props) {
    super(props);

    this.state = {
      detailData: [],
      entities: [],
      isLoading: true,
      queryAttribute: "throughput",
      queryLimit: "50",
      relationships: [],
      selectedEntity: null,
    };

    this.handleAttributeChange = this.handleAttributeChange.bind(this);
    this.handleChartGroupClick = this.handleChartGroupClick.bind(this);
    this.handleLimitChange = this.handleLimitChange.bind(this);
  }

  componentDidMount() {
    this.fetchChordData();
  }

  componentDidUpdate(prevProps, prevState) {
    const { account, timeRange } = this.props;
    const { queryAttribute, queryLimit } = this.state;

    if (
      account !== prevProps.account ||
      queryAttribute !== prevState.queryAttribute ||
      queryLimit !== prevState.queryLimit ||
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
    const { queryAttribute } = this.state;

    if (!account || !account.id) return;

    this.setState({ detailData: [] });

    const results = await fetchNrqlResults(account.id, this.createNrqlQuery());

    let entities = [];
    let detailData = [];

    const data = results.reduce((acc, d) => {
      const source = d.facet[0];
      const target = d.facet[1];

      if (entities.indexOf(source) === -1) entities.push(source);
      const s = entities.indexOf(source);

      if (entities.indexOf(target) === -1) entities.push(target);
      const t = entities.indexOf(target);

      if (!Array.isArray(acc[s])) acc[s] = [];

      const value = d["value"] || 0;
      acc[s][t] = value;
      detailData.push({ source, target, value });

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
    const { queryAttribute, queryLimit } = this.state;

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

  handleLimitChange(limit) {
    if (limit > 0 && limit <= 100) {
      this.setState({ queryLimit: limit });
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
    const { queryAttribute, queryLimit } = this.state;
    return (
      <>
        <BlockText type={BlockText.TYPE.NORMAL}>
          <strong>Account</strong>
        </BlockText>
        <AccountDropdown
          className='account-dropdown'
          onSelect={this.handleAccountChange}
          urlState={this.props.nerdletUrlState}
        />
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
            <label>Highest Throughput</label>
          </div>
          <div className='radio-option'>
            <Radio value='count' />
            <label>Most flows collected</label>
          </div>
        </RadioGroup>
        <br />
        <BlockText type={BlockText.TYPE.NORMAL}>
          <strong>Limit results to...</strong>
        </BlockText>
        <RadioGroup
          className='radio-group'
          name='limit'
          onChange={this.handleLimitChange}
          selectedValue={queryLimit}
        >
          <div className='radio-option'>
            <Radio value='25' />
            <label>25 devices</label>
          </div>
          <div className='radio-option'>
            <Radio value='50' />
            <label>50 devices</label>
          </div>
          <div className='radio-option'>
            <Radio value='100' />
            <label>100 devices</label>
          </div>
        </RadioGroup>
      </>
    );
  }

  render() {
    const { entities, entityColors, isLoading, relationships, selectedEntity } = this.state;
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
            height={height}
            innerRadius={innerRadius}
            matrix={relationships}
            outerRadius={outerRadius}
            width={width}
            groupOnClick={this.handleChartGroupClick}
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
