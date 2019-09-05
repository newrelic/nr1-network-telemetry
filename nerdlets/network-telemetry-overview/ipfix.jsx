import {
  BLURRED_LINK_OPACITY,
  FOCUSED_LINK_OPACITY,
  INTERVAL_SECONDS_DEFAULT,
  INTERVAL_SECONDS_MIN,
  NRQL_IPFIX_WHERE,
  NRQL_QUERY_LIMIT_DEFAULT,
} from "./constants";

import { BlockText, Grid, GridItem, Modal, Spinner, Stack, StackItem } from "nr1";
import { Radio, RadioGroup } from "react-radio-group";

import IpfixDetail from "./ipfix-detail";
import NetworkSummary from "./network-summary";
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
    this.startTimer();
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
      this.fetchIpfixData();

      this.refresh = setInterval(async () => {
        this.fetchIpfixData();
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
      this.fetchIpfixData();
      // this.resetTimer();
    }
  }

  createNrqlQuery() {
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

    const { nodes, links } = await fetchRelationshipFacets(account.id, this.createNrqlQuery());

    this.setState({
      isLoading: false,
      links,
      nodes,
    });
  }

  /*
   * Render detailed modal
   */
  renderDetailCard() {
    const account = this.props.account || {};
    const { detailData, detailHidden, nodes, peerBy } = this.state;

    if (!account || !detailData || detailHidden) return;

    let peerName = (nodes[detailData.sourceId] || {}).name || "";
    let filter = " AND " + peerBy + " = ";
    if (peerBy === "bgpSourceAsNumber") {
      filter += peerName;
    } else {
      filter += "'" + peerName + "'";
    }

    if ((detailData.source || {}).depth === 1) {
      filter += " AND destinationIPv4Address = '" + detailData.target.name + "'";
      peerName += " to " + detailData.target.name;
    }

    return (
      <Modal hidden={detailHidden} onClose={this.handleDetailClose}>
        <IpfixDetail accountId={account.id} filter={filter} name={peerName} />
      </Modal>
    );
  }

  renderSubMenu() {
    const { peerBy } = this.state;

    return (
      <div className='top-menu'>
        <BlockText type={BlockText.TYPE.NORMAL}>
          <strong>Show peers by...</strong>
        </BlockText>
        <RadioGroup
          className='radio-group'
          name='peerBy'
          onChange={this.handlePeerByChange}
          selectedValue={peerBy}
        >
          <label htmlFor={"peerName"}>
            <Radio value='peerName' />
            Peer Name
          </label>
          <label htmlFor={"bgpSourceAsNumber"}>
            <Radio value='bgpSourceAsNumber' />
            AS Number
          </label>
        </RadioGroup>

        <div className='refresh-controls'></div>
      </div>
    );
  }

  /*
   * Main render
   */
  render() {
    const { height, width } = this.props;
    const { activeLink, links, nodes, isLoading } = this.state;

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
                    <Sankey
                      height={height}
                      links={renderLinks}
                      nodes={nodes}
                      onLinkClick={this.handleSankeyLinkClick}
                      onLinkMouseOut={() => this.setState({ activeLink: null })}
                      onLinkMouseOver={node => this.setState({ activeLink: node })}
                      width={width}
                    />
                  )}
                </div>
              </StackItem>
            </Stack>
          </GridItem>
          <GridItem columnSpan={4}>
            <NetworkSummary data={nodes} />
          </GridItem>
        </Grid>
      </div>
    );
  }
}
