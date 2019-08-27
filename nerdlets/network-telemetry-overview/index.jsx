import PropTypes from "prop-types";
import React from "react";
import ChordDiagram from "react-chord-diagram";
import { Table } from "semantic-ui-react";
import { bitsToSize, intToSize } from "../../src/lib/bytes-to-size";
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
  NerdGraphQuery,
  Spinner,
} from "nr1";
import { RadioGroup, Radio } from "react-radio-group";

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
    const { queryAttribute } = this.state;

    this.setState({ isLoading: true, detailData: [] });

    const results = await NerdGraphQuery.query({
      query: NERDGRAPH_NRQL_QUERY,
      variables: {
        accountid: 1,
        nrql: this.createNrqlQuery(),
      },
    });

    let entities = [];
    let detailData = [];

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
    const {
      detailData,
      entities,
      entityColors,
      queryAttribute,
      queryLimit,
      isLoading,
      relationships,
      selectedEntity,
    } = this.state;
    const width = 600;
    const height = 700;
    const outerRadius = Math.min(height, width) * 0.5 - 100;
    const innerRadius = outerRadius - 10;

    console.log(detailData);

    return (
      <div className='background'>
        <Grid className='fullheight'>
          <GridItem className='side-menu' columnSpan={2}>
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
          </GridItem>
          <GridItem className='chord-container' columnSpan={7}>
            {isLoading ? (
              <Spinner fillContainer />
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
          </GridItem>
          <GridItem className='side-info' columnSpan={3}>
            <table>
              <tbody>
                <tr>
                  <td>
                    <Icon type={Icon.TYPE.HARDWARE_AND_SOFTWARE__HARDWARE__NETWORK} />
                  </td>
                  <td>
                    <BlockText type={BlockText.TYPE.PARAGRAPH}>
                      {selectedEntity || "All Devices"}
                    </BlockText>
                  </td>
                </tr>
                <tr>
                  <td>&nbsp;</td>
                  <td>
                    <BlockText className='minor-heading' type={BlockText.TYPE.NORMAL}>
                      Device
                    </BlockText>
                  </td>
                </tr>
              </tbody>
            </table>
            <Tabs defaultSelectedItem='flow-tab'>
              <TabsItem itemKey='flow-tab' label='flow summary'>
                <Table compact striped>
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell sorted='ascending'>source</Table.HeaderCell>
                      <Table.HeaderCell>destination</Table.HeaderCell>
                      <Table.HeaderCell>{this.state.queryAttribute}</Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {detailData.map((r, k) => (
                      <Table.Row key={k}>
                        <Table.Cell>{r.source}</Table.Cell>
                        <Table.Cell>{r.target}</Table.Cell>
                        <Table.Cell>
                          {queryAttribute === "throughput"
                            ? bitsToSize(r.value)
                            : intToSize(r.value)}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </TabsItem>
              <TabsItem itemKey='other-tab' label='device info'>
                TODO: Link {selectedEntity} back to an Entity via NetworkSample
              </TabsItem>
            </Tabs>
          </GridItem>
        </Grid>
      </div>
    );
  }
}
