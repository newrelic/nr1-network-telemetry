import {
  BLURRED_LINK_OPACITY,
  FOCUSED_LINK_OPACITY,
  INTERVAL_SECONDS_DEFAULT,
  INTERVAL_SECONDS_MIN,
  NRQL_IPFIX_WHERE_NO_PRIVATE_ASN,
  NRQL_QUERY_LIMIT_DEFAULT,
  SUB_MENU_HEIGHT,
} from "./constants";

import {
  BlockText,
  Checkbox,
  Grid,
  GridItem,
  Modal,
  Radio,
  RadioGroup,
  Spinner,
  Stack,
  StackItem,
} from "nr1";

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
    hideLabels: PropTypes.bool,
    intervalSeconds: PropTypes.number,
    queryLimit: PropTypes.number,
    width: PropTypes.number,
  };

  static defaultProps = {
    height: 650,
    hideLabels: false,
    intervalSeconds: INTERVAL_SECONDS_DEFAULT,
    queryLimit: NRQL_QUERY_LIMIT_DEFAULT,
    width: 700,
  };

  constructor(props) {
    super(props);

    const { height, width } = this.props;

    this.state = {
      activeLink: null,
      detailData: null,
      detailHidden: true,
      filterPrivateAsns: true,
      height: height - 2 * SUB_MENU_HEIGHT,
      isLoading: true,
      links: [],
      nodes: [],
      peerBy: "peerName",
      width: width,
    };

    this.handleDetailClose = this.handleDetailClose.bind(this);
    this.handleFilterPrivateAsnsChange = this.handleFilterPrivateAsnsChange.bind(this);
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

  async handlePeerByChange(evt, peerBy) {
    if (peerBy) {
      await this.setState({ peerBy });
      this.fetchIpfixData();
    }
  }

  async handleFilterPrivateAsnsChange(evt) {
    const filterPrivateAsns = ((evt || {}).target || {}).checked;

    await this.setState({ filterPrivateAsns });
    this.fetchIpfixData();
  }

  createNrqlQuery() {
    const { intervalSeconds, queryLimit } = this.props;
    const { filterPrivateAsns, peerBy } = this.state;

    return (
      "FROM ipfix" +
      " SELECT sum(octetDeltaCount * 64000) as 'value'" +
      (filterPrivateAsns ? NRQL_IPFIX_WHERE_NO_PRIVATE_ASN : "") +
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
    const { hideLabels } = this.props;
    const { detailData, detailHidden, filterPrivateAsns, nodes, peerBy } = this.state;

    if (!account || !detailData || detailHidden) return;

    let peerName = (nodes[detailData.sourceId] || {}).name || "";
    let filter =
      (filterPrivateAsns ? `${NRQL_IPFIX_WHERE_NO_PRIVATE_ASN} AND ` : "WHERE ") + peerBy + " = ";
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
        <IpfixDetail
          accountId={account.id}
          filter={filter}
          hideLabels={hideLabels}
          name={peerName}
        />
      </Modal>
    );
  }

  renderSubMenu() {
    const { filterPrivateAsns, peerBy } = this.state;

    return (
      <div className='top-menu'>
        <div>
          <BlockText type={BlockText.TYPE.NORMAL}>
            <strong>Show peers by...</strong>
          </BlockText>
          <RadioGroup
            className='horizontal-radio-group'
            onChange={this.handlePeerByChange}
            value={peerBy}
          >
            <Radio label='Peer Name' value='peerName' />
            <Radio label='AS Number' value='bgpSourceAsNumber' />
          </RadioGroup>
        </div>

        <div>
          <Checkbox
            checked={filterPrivateAsns}
            className='checkbox'
            label='Filter Private ASNs'
            onChange={this.handleFilterPrivateAsnsChange}
          />
        </div>
      </div>
    );
  }

  /*
   * Main render
   */
  render() {
    const { hideLabels } = this.props;
    const { activeLink, height, links, nodes, isLoading, width } = this.state;

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

    const renderNodes = hideLabels ? nodes.map((n, idx) => ({ ...n, name: `${idx}` })) : nodes;

    return (
      <div className='background'>
        {this.renderDetailCard()}
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
                    <div>
                      <div style={{ display: "flex", margin: "5px" }}>
                        <div style={{ fontWeight: "600", textAlign: "left", width: "33%" }}>
                          Source
                        </div>
                        <div style={{ fontWeight: "600", textAlign: "center", width: "34%" }}>
                          Router
                        </div>
                        <div style={{ fontWeight: "600", textAlign: "right", width: "33%" }}>
                          Destination
                        </div>
                      </div>
                      <Sankey
                        height={height}
                        links={renderLinks}
                        nodes={renderNodes}
                        onLinkClick={this.handleSankeyLinkClick}
                        onLinkMouseOut={() => this.setState({ activeLink: null })}
                        onLinkMouseOver={node => this.setState({ activeLink: node })}
                        width={width}
                      />
                    </div>
                  )}
                </div>
              </StackItem>
            </Stack>
          </GridItem>
          <GridItem columnSpan={4}>
            <NetworkSummary
              data={renderNodes}
              deviceName={"All Peers"}
              deviceType={"Network entity"}
              height={height}
              hideLabels={hideLabels}
            />
          </GridItem>
        </Grid>
      </div>
    );
  }
}
