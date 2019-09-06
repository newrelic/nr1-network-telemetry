import { BlockText, Grid, GridItem, Spinner, Stack, StackItem } from "nr1";
import {
  INTERVAL_SECONDS_DEFAULT,
  INTERVAL_SECONDS_MIN,
  NRQL_QUERY_LIMIT_DEFAULT,
} from "./constants";
import { Radio, RadioGroup } from "react-radio-group";

import ChordDiagram from "react-chord-diagram";
import NetworkSummary from "./network-summary";
import PropTypes from "prop-types";
import React from "react";
import { fetchRelationshipFacets } from "./fetch";
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
      isLoading: true,
      links: [],
      nodes: [],
      queryAttribute: "throughput",
      selectedNodeId: -1,
    };

    this.handleAttributeChange = this.handleAttributeChange.bind(this);
    this.handleChartGroupClick = this.handleChartGroupClick.bind(this);
  }

  componentDidMount() {
    this.startTimer();
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
      this.resetTimer();
    }
  }

  componentWillUnmount() {
    this.stopTimer();
  }

  /*
   * Timer
   */
  startTimer() {
    const { intervalSeconds } = this.props || INTERVAL_SECONDS_DEFAULT;

    if (intervalSeconds >= INTERVAL_SECONDS_MIN) {
      // Fire right away, then schedule
      this.fetchData();

      this.refresh = setInterval(async () => {
        this.fetchData();
      }, intervalSeconds * 1000);
    }
  }

  stopTimer() {
    if (this.refresh) clearInterval(this.refresh);
  }

  async resetTimer() {
    await this.setState({ isLoading: true });
    this.stopTimer();
    this.startTimer();
  }

  /*
   * fetch data
   */
  async fetchData() {
    const { account } = this.props;

    if (!account || !account.id) return;

    const { nodes, links } = await fetchRelationshipFacets(account.id, this.createNrqlQuery());

    this.setState({
      isLoading: false,
      links,
      nodes,
    });
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
    const { selectedNodeId } = this.state;

    if (id === selectedNodeId) this.setState({ selectedNodeId: -1 });
    else this.setState({ selectedNodeId: id });
  }

  renderSubMenu() {
    const { queryAttribute } = this.state;

    return (
      <div className='top-menu'>
        <BlockText type={BlockText.TYPE.NORMAL}>
          <strong>Show devices with...</strong>
        </BlockText>
        <RadioGroup
          className='radio-group'
          name='attribute'
          onChange={this.handleAttributeChange}
          selectedValue={queryAttribute}
        >
          <label htmlFor={"throughput"}>
            <Radio value='throughput' />
            Highest Throughput
          </label>
          <label htmlFor={"count"}>
            <Radio value='count' />
            Most flows collected
          </label>
        </RadioGroup>
      </div>
    );
  }

  render() {
    const { isLoading, nodes, links, queryAttribute, selectedNodeId } = this.state;
    const { height, width } = this.props;
    const outerRadius = Math.min(height, width) * 0.5 - 100;
    const innerRadius = outerRadius - 10;

    const entityCount = nodes.length;
    const matrix = [];

    // create a matrix of zeros
    for (let x = 0; x <= entityCount; x++) {
      matrix[x] = [];
      for (let y = 0; y <= entityCount; y++) {
        matrix[x][y] = 0;
      }
    }

    // Add the links
    links.forEach(link => (matrix[link.source][link.target] = link.value));

    const summaryColumns = [
      { align: "center", data: "color", label: null },
      { align: "left", data: "source", label: "source" },
      { align: "left", data: "target", label: "target" },
      { align: "right", data: "value", label: queryAttribute },
    ];

    const summaryData = links
      .filter(l =>
        selectedNodeId < 0 ? true : l.source === selectedNodeId || l.target === selectedNodeId
      )
      .map(l => {
        return { ...l, source: nodes[l.source].name, target: nodes[l.target].name };
      });

    const deviceName = selectedNodeId >= 0 ? (nodes[selectedNodeId] || {}).name : null;

    return (
      <div className='background'>
        <Grid className='fullheight'>
          <GridItem columnSpan={8}>
            <Stack
              alignmentType={Stack.ALIGNMENT_TYPE.FILL}
              directionType={Stack.DIRECTION_TYPE.VERTICAL}
            >
              <StackItem>
                <div className='sub-menu'>{this.renderSubMenu()}</div>
              </StackItem>
              <StackItem>
                <div className='main-container'>
                  {isLoading ? (
                    <Spinner fillContainer />
                  ) : nodes.length < 1 ? (
                    <div>No results found</div>
                  ) : (
                    <ChordDiagram
                      componentId={1}
                      groupColors={nodes.map(n => n.color)}
                      groupLabels={nodes.map(n => n.name)}
                      groupOnClick={this.handleChartGroupClick}
                      height={height}
                      innerRadius={innerRadius}
                      matrix={matrix}
                      outerRadius={outerRadius}
                      width={width}
                    />
                  )}
                </div>
              </StackItem>
            </Stack>
          </GridItem>
          <GridItem columnSpan={4}>
            <NetworkSummary
              columns={summaryColumns}
              data={summaryData}
              deviceName={deviceName}
              height={height}
            />
          </GridItem>
        </Grid>
      </div>
    );
  }
}
