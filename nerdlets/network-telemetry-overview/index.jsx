import PropTypes from "prop-types";
import React from "react";
import ChordDiagram from "react-chord-diagram";
import { Grid, GridItem, HeadingText, NerdGraphQuery, Spinner } from "nr1";
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
      entities: [],
      isLoading: true,
      queryAttribute: "throughput",
      queryLimit: "50",
      relationships: [],
    };

    this.handleAttributeChange = this.handleAttributeChange.bind(this);
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
    const {
      entities,
      entityColors,
      queryAttribute,
      queryLimit,
      isLoading,
      relationships,
    } = this.state;
    const width = 600;
    const height = 700;
    const outerRadius = Math.min(height, width) * 0.5 - 100;
    const innerRadius = outerRadius - 10;

    return (
      <div className='background'>
        <Grid className='fullheight'>
          <GridItem className='side-menu' columnSpan={2}>
            <HeadingText type={HeadingText.TYPE.HEADING4}>Line Visualization</HeadingText>
            <RadioGroup
              className='radio-group'
              name='attribute'
              onChange={this.handleAttributeChange}
              selectedValue={queryAttribute}
            >
              <div className='radio-option'>
                <Radio value='throughput' />
                <label>Throughput</label>
              </div>
              <div className='radio-option'>
                <Radio value='count' />
                <label>Flows Collected</label>
              </div>
            </RadioGroup>
            <br />
            <HeadingText type={HeadingText.TYPE.HEADING4}>Entity Limit</HeadingText>
            <RadioGroup
              className='radio-group'
              name='limit'
              onChange={this.handleLimitChange}
              selectedValue={queryLimit}
            >
              <div className='radio-option'>
                <Radio value='25' />
                <label>25</label>
              </div>
              <div className='radio-option'>
                <Radio value='50' />
                <label>50</label>
              </div>
              <div className='radio-option'>
                <Radio value='100' />
                <label>100</label>
              </div>
            </RadioGroup>
          </GridItem>
          <GridItem className='chord-container' columnSpan={7}>
            {isLoading ? (
              <Spinner fillContainer />
            ) : (
              <ChordDiagram
                className='chord-chart'
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
          </GridItem>
          <GridItem className='side-info' columnSpan={3}>
            <HeadingText type={HeadingText.TYPE.HEADING4}>Overview</HeadingText>
            Stuff goes here...
            <HeadingText type={HeadingText.TYPE.HEADING4}>Details</HeadingText>
          </GridItem>
        </Grid>
      </div>
    );
  }
}
