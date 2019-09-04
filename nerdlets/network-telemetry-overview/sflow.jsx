import { BlockText, Grid, GridItem, Spinner, Stack, StackItem } from "nr1";
import { Radio, RadioGroup } from "react-radio-group";
import { renderDeviceHeader, renderSummaryInfo } from "./common";

import ChordDiagram from "react-chord-diagram";
import { NRQL_QUERY_LIMIT_DEFAULT } from "./constants";
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
      detailData: [],
      entities: [],
      isLoading: true,
      links: [],
      nodes: [],
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

    this.setState({ isLoading: true });

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
    const { nodes, links } = this.state;
    const { isLoading, selectedEntity } = this.state;
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
            <div className='side-info'>
              {renderDeviceHeader(selectedEntity)}
              {renderSummaryInfo(nodes)}
            </div>
          </GridItem>
        </Grid>
      </div>
    );
  }

  renderDeviceInfo() {
    const { selectedEntity } = this.state;

    return <BlockText>TODO: Link {selectedEntity} back to an Entity via NetworkSample</BlockText>;
  }
}
