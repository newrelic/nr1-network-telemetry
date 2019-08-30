import React from "react";
import PropTypes from "prop-types";
import {
  Button,
  BlockText,
  ChartGroup,
  LineChart,
  Grid,
  GridItem,
  Modal,
  Spinner,
  HeadingText,
} from "nr1";
import { AccountDropdown } from "nr1-commune/components/account-dropdown";
import { fetchNrqlResults } from "../../src/lib/nrql";
import { Sankey } from "react-vis";
import { RadioGroup, Radio } from "react-radio-group";
import { Table } from "semantic-ui-react";
import { bitsToSize } from "../../src/lib/bytes-to-size";
import { renderDeviceHeader } from "../common";

import * as d3 from "d3";

const BLURRED_LINK_OPACITY = 0.3;
const FOCUSED_LINK_OPACITY = 0.6;
const COLOR_END = "#FFC400";
const COLOR_START = "#3ED2F2";
const COLORS = [
  "#11A893",
  "#00B3D7",
  "#FFC400",
  "#A45AC1",
  "#83CB4E",
  "#FA6E37",
  "#C40685",

  "#4ACAB7",
  "#3ED2F2",
  "#FFDD78",
  "#C07DDB",
  "#A2E572",
  "#FF9269",
  "#E550B0",

  "#0E7365",
  "#0189A4",
  "#CE9E00",
  "#79428E",
  "#63973A",
  "#C6562C",
  "#910662",
];

const NRQL_IPFIX_WHERE =
  " WHERE (bgpSourceAsNumber > 1 AND bgpSourceAsNumber < 64495)" +
  " OR (bgpSourceAsNumber > 65534 AND bgpSourceAsNumber < 4200000000)" +
  " OR (bgpSourceAsNumber > 4294967294)";

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
      activeLink: null,
      enabled: false,
      detailData: null,
      intervalSeconds: 30,
      isLoading: true,
      links: [],
      nodeSummary: [],
      nodes: [],
      peerBy: "peerName",
      reset: false,
      hideDetail: true,
      detailPaused: false,
    };

    this.handleAccountChange = this.handleAccountChange.bind(this);
    this.handlePeerByChange = this.handlePeerByChange.bind(this);
    this.handleIntervalSecondsChange = this.handleIntervalSecondsChange.bind(this);
    this.handleSankeyLinkClick = this.handleSankeyLinkClick.bind(this);
    this.handleDetailClose = this.handleDetailClose.bind(this);
  }

  /*
   * React Lifecycle
   */
  componentDidMount() {}

  startTimer() {
    const { intervalSeconds } = this.state;

    this.fetchIpfixData();
    this.refresh = setInterval(async () => {
      this.fetchIpfixData();
    }, intervalSeconds * 1000);
  }

  stopTimer() {
    if (this.refresh) clearInterval(this.refresh);
  }

  async resetTimer() {
    await this.setState({ enabled: false, isLoading: true, reset: true });
    this.stopTimer();
    this.setState({ enabled: true });
    this.startTimer();
    this.setState({ isLoading: false });
  }

  /*
   * Helper functions
   */
  handleSankeyLinkClick(detailData, evt) {
    const { enabled } = this.state;

    // Track that the detail paused things
    if (enabled) this.setState({ enabled: false, detailPaused: true });

    this.setState({ detailData, hideDetail: false });
  }

  handleDetailClose() {
    const { detailPaused } = this.state;

    // If showing the detail caused the pause, unpause, otherwise return
    // with a paused state
    if (detailPaused) this.setState({ enabled: true, detailPaused: false });

    this.setState({ hideDetail: true });
  }

  async handleAccountChange(account) {
    if (account) {
      await this.setState({ account });
      this.resetTimer();
      this.setState({ enabled: true });
    }
  }

  async handlePeerByChange(peerBy) {
    if (peerBy) {
      await this.setState({ peerBy });
      this.resetTimer();
    }
  }

  handleIntervalSecondsChange(evt) {
    const intervalSeconds = (evt.target || {}).value || 3;

    if (intervalSeconds > 3) {
      this.stopTimer();
      this.setState({ intervalSeconds });
      this.startTimer();
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

  createSankeyNrqlQuery() {
    const { peerBy, intervalSeconds } = this.state;

    return (
      "FROM ipfix" +
      " SELECT sum(octetDeltaCount * 64000) as 'value'" +
      NRQL_IPFIX_WHERE +
      " FACET " +
      peerBy +
      ", agent, destinationIPv4Address" +
      " SINCE " +
      intervalSeconds +
      " seconds ago" +
      " LIMIT 50"
    );
  }

  async fetchIpfixData() {
    const { account, enabled, reset } = this.state;

    if (!enabled || !account || !account.id) return;

    const nodeSummary = reset ? [] : this.state.nodeSummary;
    if (reset) this.setState({ reset: false });

    const results = await fetchNrqlResults(account.id, this.createSankeyNrqlQuery());

    // Bail if we get nothing
    if (results.length < 1) {
      return;
    }

    let links = [];
    let nodes = [];

    results.forEach(row => {
      // Collect nodes
      const ids = (row.facet || []).map(f => {
        const id = nodes.findIndex(node => node.name === f);
        if (id < 0) return nodes.push({ name: f }) - 1;

        return id;
      });

      const value = row.value;
      let sourceId = nodeSummary.findIndex(node => node.name === nodes[ids[0]].name);
      if (sourceId >= 0) {
        nodeSummary[sourceId].value += value;
      } else {
        sourceId =
          nodeSummary.push({
            color: COLORS[nodeSummary.length % COLORS.length],
            name: nodes[ids[0]].name,
            value,
          }) - 1;
      }

      // Update existing links (AS => Router)
      const sa = links.findIndex(link => link.source === ids[0] && link.target === ids[1]);
      if (sa >= 0) {
        links[sa].value += value;
      } else {
        links.push({
          source: ids[0],
          target: ids[1],
          value,
          color: nodeSummary[sourceId].color,
          sourceId,
        });
      }

      // Update existing links (Router => IP)
      const ad = links.findIndex(link => link.source === ids[1] && link.target === ids[2]);
      if (ad >= 0) {
        links[ad].value += value;
      } else {
        links.push({
          source: ids[1],
          target: ids[2],
          value,
          color: nodeSummary[sourceId].color,
          sourceId,
        });
      }
    });

    this.setState({
      isLoading: false,
      links,
      nodeSummary,
      nodes,
    });
  }

  /*
   * Main render
   */
  renderDetailCard() {
    const { account, detailData, hideDetail, peerBy } = this.state;

    const throughputQuery =
      "FROM ipfix" +
      " SELECT sum(octetDeltaCount * 64000) as 'throughput'" +
      NRQL_IPFIX_WHERE +
      (detailData ? " AND " + peerBy + " = '" + (detailData.source || {}).name + "'" : "") +
      " TIMESERIES";

    const destQuery =
      "FROM ipfix" +
      " SELECT sum(octetDeltaCount * 64000) as 'throughput'" +
      NRQL_IPFIX_WHERE +
      (detailData ? " AND " + peerBy + " = '" + (detailData.source || {}).name + "'" : "") +
      " FACET destinationIPv4Address " +
      " TIMESERIES";

    const protocolQuery =
      "FROM ipfix" +
      " SELECT count(*) as 'flows'" +
      NRQL_IPFIX_WHERE +
      (detailData ? " AND " + peerBy + " = '" + (detailData.source || {}).name + "'" : "") +
      " FACET cases(" +
      "   WHERE protocolIdentifier = 1 as 'ICMP', " +
      "   WHERE protocolIdentifier = 6 as 'TCP'," +
      "   WHERE protocolIdentifier = 17 as 'UDP'," +
      "   WHERE protocolIdentifier IS NOT NULL as 'other')" +
      " TIMESERIES";

    return (
      <Modal hidden={this.state.hideDetail} onClose={this.handleDetailClose}>
        <div className='side-menu'>
          <ChartGroup>
            {renderDeviceHeader(((detailData || {}).source || {}).name, "Network Entity")}

            <HeadingText type={HeadingText.TYPE.HEADING4}>Total Throughput</HeadingText>
            <LineChart
              accountId={account.id || null}
              style={{ height: 200 }}
              query={throughputQuery}
            />

            <HeadingText type={HeadingText.TYPE.HEADING4}>Throughput by Destination IP</HeadingText>
            <LineChart accountId={account.id || null} style={{ height: 200 }} query={destQuery} />

            <HeadingText type={HeadingText.TYPE.HEADING4}>Flows by Protocol</HeadingText>
            <LineChart
              accountId={account.id || null}
              style={{ height: 200 }}
              query={protocolQuery}
            />
          </ChartGroup>
        </div>
      </Modal>
    );
  }
  renderSideMenu() {
    const { intervalSeconds, peerBy } = this.state;

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
        <BlockText type={BlockText.TYPE.NORMAL}>
          <strong>Refresh interval seconds: {intervalSeconds}</strong>
        </BlockText>
        <input
          type='range'
          min='3'
          max='60'
          value={intervalSeconds}
          onChange={this.handleIntervalSecondsChange}
          className='slider'
          id='intervalSeconds'
          step='1'
        />
        <br />
        <Button
          onClick={() => this.setState(prevState => ({ enabled: !prevState.enabled }))}
          sizeType={Button.SIZE_TYPE.SLIM}
        >
          {this.state.enabled ? "Pause" : "Resume"}
        </Button>
      </>
    );
  }

  render() {
    const { activeLink, links, nodes, isLoading } = this.state;

    console.log(activeLink);

    // Add link highlighting
    const renderLinks = links.map((link, linkIndex) => {
      let opacity = BLURRED_LINK_OPACITY;

      if (activeLink) {
        // I'm the hovered link
        if (linkIndex === activeLink.index) {
          console.log(link);
          opacity = FOCUSED_LINK_OPACITY;
        } else {
          // let's recurse
          const myLinks = [
            ...((activeLink.source || {}).targetLinks || []),
            ...((activeLink.target || {}).sourceLinks || []),
          ];
          if (myLinks) {
            myLinks.forEach(t => {
              if (t.index === linkIndex && t.sourceId === activeLink.sourceId)
                opacity = FOCUSED_LINK_OPACITY;
            });
          }
        }
      }

      return { ...link, opacity };
    });

    return (
      <div className='background'>
        {this.renderDetailCard()}
        <Grid className='fullheight'>
          <GridItem className='side-menu' columnSpan={2}>
            {this.renderSideMenu()}
          </GridItem>
          <GridItem className='sankey-container' columnSpan={7}>
            {isLoading ? (
              <Spinner fillContainer />
            ) : (
              <Sankey
                nodes={nodes}
                links={renderLinks}
                width={700}
                height={700}
                onLinkClick={this.handleSankeyLinkClick}
                onLinkMouseOver={node => this.setState({ activeLink: node })}
                onLinkMouseOut={() => this.setState({ activeLink: null })}
              />
            )}
          </GridItem>
          <GridItem className='side-info' columnSpan={3}>
            {this.renderSummaryInfo()}
          </GridItem>
        </Grid>
      </div>
    );
  }

  renderSummaryInfo() {
    const { nodeSummary } = this.state;

    return (
      <>
        <BlockText type={BlockText.TYPE.NORMAL}>
          <strong>Summary</strong>
        </BlockText>
        <Table compact striped>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Source</Table.HeaderCell>
              <Table.HeaderCell>Throughput</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {nodeSummary
              .sort((a, b) => (a.value < b.value ? 1 : -1))
              .map((n, k) => (
                <Table.Row key={k} style={{ color: n.color }}>
                  <Table.Cell>{n.name || "(Unknown)"}</Table.Cell>
                  <Table.Cell>{bitsToSize(n.value)}</Table.Cell>
                </Table.Row>
              ))}
          </Table.Body>
        </Table>
      </>
    );
  }
}
