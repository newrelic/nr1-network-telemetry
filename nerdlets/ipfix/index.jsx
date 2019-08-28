import React from "react";
import PropTypes from "prop-types";
import { Button, BlockText, Grid, GridItem, Spinner } from "nr1";
import { AccountDropdown } from "nr1-commune";
import { fetchNrqlResults } from "../../src/lib/nrql";
import { Sankey } from "react-vis";
import { RadioGroup, Radio } from "react-radio-group";
import { Table } from "semantic-ui-react";
import { bitsToSize } from "../../src/lib/bytes-to-size";

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
      peerBy: 'peerName',
      links: [],
      nodes: [],
      nodeSummary: [],
      reset: false,
    };

    this.handleAccountChange = this.handleAccountChange.bind(this);
    this.handlePeerByChange = this.handlePeerByChange.bind(this);
  }

  /*
   * React Lifecycle
   */
  componentDidMount() {
    this.startTimer();
  }

  startTimer() {
    this.refresh = setInterval(async () => {
      if (this.state.enabled) {
        this.fetchIpfixData();
      }
    }, 3000);
  }

  stopTimer() {
    clearInterval(this.refresh)
  }

  /*
   * Helper functions
   */
  handleAccountChange(account) {
    if (account) {
      this.setState({ account, isLoading: false, enabled: true });
    }
  }

  async handlePeerByChange(peerBy) {
    if (peerBy) {
      this.stopTimer();
      await this.setState({ peerBy, isLoading: true, enabled: false, reset: true });
      this.startTimer();
      this.setState({ isLoading: false, enabled: true });
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
    const { account, peerBy, reset } = this.state;

    if (!account || !account.id) return;

    const nodeSummary = (reset ? [] : this.state.nodeSummary);
    if (reset) this.setState({ reset: false });

    const results = await fetchNrqlResults(
      account.id,
      "FROM ipfix" +
        " SELECT sum(octetDeltaCount * 64000) as 'value'" +
        " WHERE (bgpSourceAsNumber > 1 AND bgpSourceAsNumber < 64495)" +
        " OR (bgpSourceAsNumber > 65534 AND bgpSourceAsNumber < 4200000000)" +
        " OR (bgpSourceAsNumber > 4294967294)" +
        " FACET " + peerBy + ", agent, destinationIPv4Address" +
        " SINCE 3 seconds ago" +
        " LIMIT 50"
    );

    let links = [];
    let nodes = [];

    results.forEach((row) => {
      // Collect nodes
      const ids = (row.facet || []).map((f) => {
        const id = nodes.findIndex((node) => (node.name === f));
        if (id < 0) return (nodes.push({ name: f }) - 1);

        return id;
      });

      const value = row.value;
      let sId = nodeSummary.findIndex((node) => (node.name === nodes[ids[0]].name));
      if (sId >= 0) {
        nodeSummary[sId].value += value;
      } else {
        sId = nodeSummary.push({
          color: COLORS[(nodeSummary.length % COLORS.length)],
          name: nodes[ids[0]].name,
          value
        }) - 1;
      }

      // Update existing links (AS => Router)
      const sa = links.findIndex((link) => (link.source === ids[0] && link.target === ids[1]));
      if (sa >= 0) {
        links[sa].value += value;
      } else {
        links.push({ source: ids[0], target: ids[1], value, color: nodeSummary[sId].color });
      }

      // Update existing links (Router => IP)
      const ad = links.findIndex((link) => (link.source === ids[1] && link.target === ids[2]));
      if (ad >= 0) {
        links[ad].value += value;
      } else {
        links.push({ source: ids[1], target: ids[2], value, color: nodeSummary[sId].color });
      }
    });

    console.log(nodes, links);

    this.setState({
      nodeSummary,
      nodes,
      links,
    });
  }

  /*
   * Main render
   */
  render() {
    const { links, nodes, peerBy, isLoading } = this.state;

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
            <BlockText type={BlockText.TYPE.NORMAL}>
              <strong>Show peers by...</strong>
            </BlockText>
            <RadioGroup
              className='radio-group'
              name='peerBy'
              onChange={this.handlePeerByChange}
              selectedValue={peerBy}
            >
              <div className='radio-option'>
                <Radio value='peerName' />
                <label>Peer Name</label>
              </div>
              <div className='radio-option'>
                <Radio value='bgpSourceAsNumber' />
                <label>AS Number</label>
              </div>
            </RadioGroup>
            <br />
            <Button
              onClick={() => this.setState(prevState => ({ enabled: !prevState.enabled }))}
              sizeType={Button.SIZE_TYPE.SLIM}
            >
              {this.state.enabled ? "Pause" : "Resume"}
            </Button>
          </GridItem>
          <GridItem className='sankey-container' columnSpan={7}>
            {isLoading ? (
              <Spinner fillContainer />
            ) : (
              <Sankey nodes={nodes} links={links} width={700} height={700} />
            )}
          </GridItem>
          <GridItem className='side-info' columnSpan={3}>
            <BlockText type={BlockText.TYPE.NORMAL}>
              <strong>Summary</strong>
            </BlockText>
            {this.renderNodeSummaryTable()}
          </GridItem>
        </Grid>
      </div>
    );
  }

  renderNodeSummaryTable() {
    const { nodeSummary } = this.state;

    return (
      <Table compact striped>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Source</Table.HeaderCell>
            <Table.HeaderCell>Throughput</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {nodeSummary.sort((a,b) => (a.value < b.value ? 1 : -1 )).map((n, k) => (
            <Table.Row key={k} style={{ color: n.color }}>
              <Table.Cell>{n.name}</Table.Cell>
              <Table.Cell>{bitsToSize(n.value)}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    );
  }

}
