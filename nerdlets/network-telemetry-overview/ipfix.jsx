import {
  BLURRED_LINK_OPACITY,
  FOCUSED_LINK_OPACITY,
  INTERVAL_SECONDS_DEFAULT,
  NRQL_IPFIX_WHERE,
  NRQL_QUERY_LIMIT_DEFAULT,
} from "./constants";

import { BlockText, ChartGroup, Grid, GridItem, HeadingText, LineChart, Modal, Spinner } from "nr1";
import { Radio, RadioGroup } from "react-radio-group";
import { renderDeviceHeader, renderSummaryInfo } from "./common";

import PropTypes from "prop-types";
import React from "react";
import { Sankey } from "react-vis";
import { fetchRelationshipFacets } from "./fetch";

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
      nodes: [],
      peerBy: "peerName",
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
      // this.resetTimer(this.fetchIpfixData);
      this.fetchIpfixData();
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

    if (!account || !account.id) return;

    this.setState({ isLoading: true });

    const { nodes, links } = await fetchRelationshipFacets(
      account.id,
      this.createSankeyNrqlQuery()
    );

    this.setState({
      isLoading: false,
      links,
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
      <div className='background'>
        {this.renderDetailCard()}
        <Grid className='fullheight'>
          <GridItem columnSpan={8}>
            <div className='main-container'>
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
          </GridItem>
          <GridItem columnSpan={4}>
            <div className='side-info'>
              {renderDeviceHeader()}
              {renderSummaryInfo(nodes)}
            </div>
          </GridItem>
        </Grid>
      </div>
    );
  }
}
