import React from "react";
import PropTypes from "prop-types";
import { Button, BlockText, Grid, GridItem, Spinner } from "nr1";
import { AccountDropdown } from "nr1-commune";
import { fetchNrqlResults } from "../../src/lib/nrql";
import { Sankey } from "react-vis";

import * as d3 from "d3";

const COLOR_END = "#FFC400";
const COLOR_START = "#3ED2F2";
const COLORS = [
  "#11A893",
  "#4ACAB7",
  "#0E7365",
  "#00B3D7",
  "#3ED2F2",
  "#0189A4",
  "#FFC400",
  "#FFDD78",
  "#CE9E00",
  "#A45AC1",
  "#C07DDB",
  "#79428E",
  "#83CB4E",
  "#A2E572",
  "#63973A",
  "#FA6E37",
  "#FF9269",
  "#C6562C",
  "#C40685",
  "#E550B0",
  "#910662",
];

export default class Ipfix extends React.Component {
  static propTypes = {
    nerdletUrlState: PropTypes.object,
    launcherUrlState: PropTypes.object,
    width: PropTypes.number,
    height: PropTypes.number,
  };

  constructor(props) {
    super(props);

    this.state = {
      account: {},
      enabled: false,
      isLoading: true,
      links: [],
      nodes: [],
    };

    this.handleAccountChange = this.handleAccountChange.bind(this);
  }

  /*
   * React Lifecycle
   */
  componentDidMount() {
    //this.fetchIpfixData();  // don't have account yet
    this.refresh = setInterval(async ()=>{
      if(this.state.enabled){
        this.fetchIpfixData();
      }
    }, 1500);
  }

  /*
   * Helper functions
   */
  handleAccountChange(account) {
    if (account) {
      this.setState({ account, isLoading: false, enabled: true });//, () => this.fetchIpfixData());
    }
  }

  // Returns a FUNCTION that generates a color...
  colorForEntity(entityCount) {
    return d3.scale
      .linear()
      .domain([1, entityCount])
      .interpolate(d3.interpolateHsl)
      .range([d3.rgb(COLOR_START), d3.rgb(COLOR_END)]);
  }

  async fetchIpfixData() {
    const { account } = this.state;

    if (!account || !account.id) return;

    //this.setState({ isLoading: true, detailData: [] });

    //const results = await fetchNrqlResults(account.id,
    //  "FROM ipfix SELECT sum(octetDeltaCount) as 'value' " +
    //  "FACET agent, bgpSourceAsNumber, bgpDestinationAsNumber " + 
    //  "SINCE 3 seconds ago"
    //);
    const results = await fetchNrqlResults(account.id,
      "FROM ipfix" +
      " SELECT sum(octetDeltaCount * 64000) as 'value'" +
      " WHERE (bgpSourceAsNumber > 1 AND bgpSourceAsNumber < 64495)" +
      " OR (bgpSourceAsNumber > 65534 AND bgpSourceAsNumber < 4200000000)" +
      " OR (bgpSourceAsNumber > 4294967294)" +
      " FACET agent, bgpSourceAsNumber" +
      " SINCE 3 seconds ago" +
      " LIMIT 25"
    );
    console.log(results);

    let nodes = [];

    const links = results.reduce((acc, row) => {
      const agent = row.facet[0];
      const sourceAs = row.facet[1];
      const value = row.value;

      if (nodes.indexOf(agent) === -1) nodes.push(agent);
      const a = nodes.indexOf(agent);

      if (nodes.indexOf(sourceAs) === -1) nodes.push(sourceAs);
      const s = nodes.indexOf(sourceAs);

      const c = (s % COLORS.length);

      // really hand-wavey
      acc.push({ source: s, target: a, value, color: COLORS[c] });

      return acc;
    }, []);

    this.setState({
      nodes: nodes.map((n) => ({ name: n })),
      links,
    });
  }

  /*
   * Main render
   */
  render() {
    const { links, nodes, isLoading } = this.state;

    return (
      <div className='background'>
        <Grid className='fullheight'>
          <GridItem className='side-menu' columnSpan={2}>
            <BlockText type={BlockText.TYPE.NORMAL}>
              <strong>Account</strong>
            </BlockText>
            <AccountDropdown
              className='account-dropdown'
              onSelect={this.handleAccountChange}
              urlState={this.props.nerdletUrlState}
            />
            <br />
            <Button
              onClick={() => this.setState(prevState => ({ enabled: !prevState.enabled }))}
              sizeType={Button.SIZE_TYPE.SLIM}
            >
              {(this.state.enabled ? "Pause" : "Resume")}
            </Button>
          </GridItem>
          <GridItem className='chord-container' columnSpan={10}>
            {isLoading ?
              <Spinner fillContainer /> :
              <Sankey
                nodes={nodes}
                links={links}
                width={700}
                height={700}
              />
            }
          </GridItem>
        </Grid>
      </div>
    );
  }
}
