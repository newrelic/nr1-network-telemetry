import {
  BLURRED_LINK_OPACITY,
  FOCUSED_LINK_OPACITY,
  INTERVAL_SECONDS_DEFAULT,
  INTERVAL_SECONDS_MIN,
  NRQL_QUERY_LIMIT_DEFAULT,
  SUB_MENU_HEIGHT,
} from "./constants";
import { BlockText, Grid, GridItem, Radio, RadioGroup, Spinner, Stack, StackItem } from "nr1";

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
    hideLabels: PropTypes.bool,
    queryLimit: PropTypes.number,
    summaryRenderer: PropTypes.func,
    timeRange: PropTypes.object.isRequired,
    width: PropTypes.number,
  };

  static defaultProps = {
    height: 650,
    hideLabels: false,
    queryLimit: NRQL_QUERY_LIMIT_DEFAULT,
    width: 700,
  };

  constructor(props) {
    super(props);

    const { height, width } = this.props;

    this.state = {
      height: height - 2 * SUB_MENU_HEIGHT,
      isLoading: true,
      links: [],
      nodes: [],
      queryAttribute: "throughput",
      selectedSourceId: -1,
      width: width,
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

    if (this.graphContainer && this.graphContainer.clientWidth !== prevState.width) {
      const width = this.graphContainer.clientWidth;
      this.setState({ width });
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
      timeRangeToNrql(this.props.timeRange)
    );
  }

  handleAttributeChange(evt, attr) {
    if (attr === "count" || attr === "throughput") {
      this.setState({ queryAttribute: attr });
    }
  }

  handleChartGroupClick(id) {
    const { selectedSourceId } = this.state;

    if (id === selectedSourceId || id === null) this.setState({ selectedSourceId: -1 });
    else this.setState({ selectedSourceId: id });
  }

  renderSubMenu() {
    const { queryAttribute } = this.state;

    return (
      <div className='top-menu'>
        <div>
          <BlockText type={BlockText.TYPE.NORMAL}>
            <strong>Show devices with...</strong>
          </BlockText>
          <RadioGroup
            className='horizontal-radio-group'
            onChange={this.handleAttributeChange}
            value={queryAttribute}
          >
            <Radio label='Highest Throughput' value='throughput' />
            <Radio label='Most flows collected' value='count' />
          </RadioGroup>
        </div>
      </div>
    );
  }

  render() {
    const { hideLabels } = this.props;
    const { isLoading, height, nodes, links, queryAttribute, selectedSourceId, width } = this.state;
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
        selectedSourceId < 0 ? true : l.source === selectedSourceId || l.target === selectedSourceId
      )
      .map(l => {
        const source = hideLabels ? l.source : nodes[l.source].name;
        const target = hideLabels ? l.target : nodes[l.target].name;

        return { ...l, source, target };
      });

    const deviceName =
      selectedSourceId >= 0
        ? hideLabels
          ? `${selectedSourceId}`
          : (nodes[selectedSourceId] || {}).name
        : null;

    return (
      <div className='background'>
        <Grid className='fullheight'>
          <GridItem columnSpan={8}>
            <Stack
              directionType={Stack.DIRECTION_TYPE.VERTICAL}
              horizontalType={Stack.HORIZONTAL_TYPE.FILL}
            >
              <StackItem>
                <div className='sub-menu' style={{ height: SUB_MENU_HEIGHT }}>
                  {this.renderSubMenu()}
                </div>
              </StackItem>
              <StackItem>
                <div
                  className='main-container'
                  ref={graphContainer => {
                    this.graphContainer = graphContainer;
                  }}
                >
                  {isLoading ? (
                    <Spinner fillContainer />
                  ) : nodes.length < 1 ? (
                    <div>No results found</div>
                  ) : (
                    <ChordDiagram
                      blurOnHover={true}
                      componentId={1}
                      disableRibbonHover={false}
                      groupColors={nodes.map(n => n.color)}
                      groupLabels={nodes.map((n, idx) => (hideLabels ? idx : n.name))}
                      groupOnClick={this.handleChartGroupClick}
                      height={height}
                      innerRadius={innerRadius}
                      matrix={matrix}
                      outerRadius={outerRadius}
                      persistHoverOnClick={true}
                      ribbonBlurOpacity={`${BLURRED_LINK_OPACITY}`}
                      ribbonOnClick={this.handleChartGroupClick}
                      ribbonOpacity={`${FOCUSED_LINK_OPACITY}`}
                      strokeWidth={0}
                      svgOnClick={() => {
                        this.handleChartGroupClick(null);
                      }}
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
              hideLabels={hideLabels}
            />
          </GridItem>
        </Grid>
      </div>
    );
  }
}
