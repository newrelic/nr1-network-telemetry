import {
  BLURRED_LINK_OPACITY,
  COLORS,
  FOCUSED_LINK_OPACITY,
  INTERVAL_SECONDS_DEFAULT,
  NRQL_IPFIX_WHERE,
  NRQL_QUERY_LIMIT_DEFAULT,
} from "./constants";

import { BlockText, ChartGroup, HeadingText, LineChart, Modal, Spinner } from "nr1";
import { Radio, RadioGroup } from "react-radio-group";

import PropTypes from "prop-types";
import React from "react";
import { Sankey } from "react-vis";
import { Table } from "semantic-ui-react";
import { bitsToSize } from "../../src/lib/bytes-to-size";
import { fetchNrqlResults } from "../../src/lib/nrql";
import { renderDeviceHeader } from "./common";

export default class Ipfix extends React.Component {
  static propTypes = {
    account: PropTypes.object.isRequired,
    height: PropTypes.number,
    intervalSeconds: PropTypes.number,
    queryLimit: PropTypes.number,
    width: PropTypes.number,
  };

  static defaultProps = {
    height: 650,
    intervalSeconds: INTERVAL_SECONDS_DEFAULT,
    queryLimit: NRQL_QUERY_LIMIT_DEFAULT,
    width: 700,
  };

  constructor(props) {
    super(props);

    this.state = {
      activeLink: null,
      detailData: null,
      detailHidden: true,
      isLoading: true,
      links: [],
      nodeSummary: [],
      nodes: [],
      peerBy: "peerName",
      reset: false,
    };

    this.handleDetailClose = this.handleDetailClose.bind(this);
    this.handlePeerByChange = this.handlePeerByChange.bind(this);
    this.handleSankeyLinkClick = this.handleSankeyLinkClick.bind(this);
  }

  componentDidMount() {
      this.fetchIpfixData();
  }

  componentDidUpdate(prevProps, prevState) {
    const { account, intervalSeconds, queryLimit } = this.props;
    const { peerBy } = this.state;

    if (
      account.id !== prevProps.account.id ||
      intervalSeconds !== prevProps.intervalSeconds ||
      queryLimit !== prevProps.queryLimit ||
      peerBy !== prevState.peerBy
    ) {
      console.log(this.props);
      //this.resetTimer(this.fetchIpfixData);
    }
  }

  componentWillUnmount() {
    this.stopTimer();
  }

  /*
   * Timer
   */
  startTimer(runThis) {
    if (runThis) {
      const { intervalSeconds } = this.props || INTERVAL_SECONDS_DEFAULT;

      if (intervalSeconds > 0) {
        // Fire right away, then schedule
        runThis();
        this.refresh = setInterval(async () => {
          runThis();
        }, intervalSeconds * 1000);
      }
    }
  }

  stopTimer() {
    if (this.refresh) clearInterval(this.refresh);
  }

  async resetTimer() {
    await this.setState({ isLoading: true });
    this.stopTimer();
    this.resetTimer(this.fetchIpfixData);
    this.setState({ isLoading: false });
  }

  /*
   * Helper functions
   */
  handleSankeyLinkClick(detailData, evt) {
    this.setState({ detailData, detailHidden: false });
  }

  handleDetailClose() {
    this.setState({ detailHidden: true });
  }

  async handlePeerByChange(peerBy) {
    if (peerBy) {
      await this.setState({ peerBy });
      this.resetTimer();
    }
  }

  createSankeyNrqlQuery() {
    const { intervalSeconds, queryLimit } = this.props;
    const { peerBy } = this.state;

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
      " LIMIT " +
      queryLimit
    );
  }

  async fetchIpfixData() {
    if (!this.props) return;

    const account = this.props.account;
    const { reset } = this.state;

    console.log(account);

    if (!account || !account.id) return;

    const nodeSummary = reset ? [] : this.state.nodeSummary;
    if (reset) this.setState({ reset: false });

    const results = await fetchNrqlResults(account.id, this.createSankeyNrqlQuery());

    // Bail if we get nothing
    if (results.length < 1) {
      return;
    }

    const links = [];
    const nodes = [];

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
          color: nodeSummary[sourceId].color,
          source: ids[0],
          sourceId,
          target: ids[1],
          value,
        });
      }

      // Update existing links (Router => IP)
      const ad = links.findIndex(link => link.source === ids[1] && link.target === ids[2]);
      if (ad >= 0) {
        links[ad].value += value;
      } else {
        links.push({
          color: nodeSummary[sourceId].color,
          source: ids[1],
          sourceId,
          target: ids[2],
          value,
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
    const { account } = this.props;
    const { detailData, detailHidden, peerBy } = this.state;

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
      <Modal hidden={detailHidden} onClose={this.handleDetailClose}>
        <div className='side-menu'>
          <ChartGroup>
            {renderDeviceHeader(((detailData || {}).source || {}).name, "Network Entity")}

            <HeadingText type={HeadingText.TYPE.HEADING4}>Total Throughput</HeadingText>
            <LineChart
              accountId={account.id || null}
              query={throughputQuery}
              style={{ height: 200 }}
            />

            <HeadingText type={HeadingText.TYPE.HEADING4}>Throughput by Destination IP</HeadingText>
            <LineChart accountId={account.id || null} query={destQuery} style={{ height: 200 }} />

            <HeadingText type={HeadingText.TYPE.HEADING4}>Flows by Protocol</HeadingText>
            <LineChart
              accountId={account.id || null}
              query={protocolQuery}
              style={{ height: 200 }}
            />
          </ChartGroup>
        </div>
      </Modal>
    );
  }

  renderSubMenu() {
    const { peerBy } = this.state;

    return (
      <div className='side-menu'>
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
            <label htmlFor={"peerName"}>Peer Name</label>
          </div>
          <div className='radio-option'>
            <Radio value='bgpSourceAsNumber' />
            <label htmlFor={"bgpSourceAsNumber"}>AS Number</label>
          </div>
        </RadioGroup>
        <br />
      </div>
    );
  }

  renderSummaryInfo() {
    const { nodeSummary } = this.state;

    return (
      <div className='side-info'>
        <BlockText type={BlockText.TYPE.NORMAL}>
          <strong>Summary</strong>
        </BlockText>
        <Table compact striped>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>&nbsp;</Table.HeaderCell>
              <Table.HeaderCell>Source</Table.HeaderCell>
              <Table.HeaderCell>Throughput</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {nodeSummary
              .sort((a, b) => (a.value < b.value ? 1 : -1))
              .map((n, k) => (
                <Table.Row key={k}>
                  <Table.Cell style={{ color: n.color }}>*</Table.Cell>
                  <Table.Cell>{n.name || "(Unknown)"}</Table.Cell>
                  <Table.Cell>{bitsToSize(n.value)}</Table.Cell>
                </Table.Row>
              ))}
          </Table.Body>
        </Table>
      </div>
    );
  }

  render() {
    const { height, width } = this.props;
    const { activeLink, links, nodes, isLoading } = this.state;

    if (isLoading) {
      return <Spinner fillContainer />;
    }

    if (nodes.length === 0 || links.length === 0) {
      return <div>No data found</div>;
    }

    // Add link highlighting
    const renderLinks = links.map((link, linkIndex) => {
      let opacity = BLURRED_LINK_OPACITY;

      if (activeLink) {
        // I'm the hovered link
        if (linkIndex === activeLink.index) {
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
      <div>
        {this.renderDetailCard()}
        <Sankey
          height={height}
          links={renderLinks}
          nodes={nodes}
          onLinkClick={this.handleSankeyLinkClick}
          onLinkMouseOut={() => this.setState({ activeLink: null })}
          onLinkMouseOver={node => this.setState({ activeLink: node })}
          width={width}
        />
      </div>
    );
  }
}
