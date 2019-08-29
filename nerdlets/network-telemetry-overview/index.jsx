import React from "react";
import ChordDiagram from "react-chord-diagram";
import { AccountDropdown } from "../../src/components/account-dropdown";
import { Table } from "semantic-ui-react";
import { bitsToSize, intToSize } from "../../src/lib/bytes-to-size";
import { timeRangeToNrql } from "../../src/components/time-range";
import PropTypes from "prop-types";
import {
  Button,
  BlockText,
  Grid,
  GridItem,
  Modal,
  Spinner,
  Stack,
  StackItem,
  HeadingText,
} from "nr1";
import { AccountDropdown } from "nr1-commune";
import { RadioGroup, Radio } from "react-radio-group";
import { renderDeviceHeader } from "./common";
import Ipfix from "./ipfix";
import Sflow from "./sflow";

import {
  NRQL_QUERY_LIMIT_MIN,
  NRQL_QUERY_LIMIT_MAX,
  NRQL_QUERY_LIMIT_DEFAULT,
  INTERVAL_SECONDS_DEFAULT,
  INTERVAL_SECONDS_MAX,
  INTERVAL_SECONDS_MIN,
} from "./constants";

export default class NetworkTelemetryNerdlet extends React.Component {
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
      dataSource: "sflow",
      queryLimit: NRQL_QUERY_LIMIT_DEFAULT,
      enabled: false,
      intervalSeconds: INTERVAL_SECONDS_DEFAULT,
      isLoading: true,
      hideDetail: true,
      detailPaused: false,
    };

    this.handleAccountChange = this.handleAccountChange.bind(this);
    this.handleDataSourceChange = this.handleDataSourceChange.bind(this);
    this.handleIntervalSecondsChange = this.handleIntervalSecondsChange.bind(this);
    this.handleLimitChange = this.handleLimitChange.bind(this);
  }

  /*
   * Timer
   */
  startTimer(runThis) {
    if (runThis) {
      const { intervalSeconds } = this.state;

      // Fire right away, then schedule
      runThis();
      this.refresh = setInterval(async () => {
        runThis();
      }, intervalSeconds * 1000);
    }
  }

  stopTimer() {
    if (this.refresh) clearInterval(this.refresh);
  }

  async resetTimer() {
    await this.setState({ enabled: false, isLoading: true });
    this.stopTimer();
    this.setState({ enabled: true });
    this.startTimer();
    this.setState({ isLoading: false });
  }

  /*
   * Helper functions
   */
  handleDataSourceChange(dataSource) {
    if (dataSource) {
      this.setState({ dataSource });
    }
  }

  async handleAccountChange(account) {
    const { enabled } = this.state;

    if (account) {
      await this.setState({ account, isLoading: false });
      if (enabled) {
        this.resetTimer();
      } else {
        this.startTimer();
      }
    }
  }

  handleIntervalSecondsChange(evt) {
    const intervalSeconds = (evt.target || {}).value || DEFAULT_INTERVAL_SECONDS;

    if (intervalSeconds >= INTERVAL_SECONDS_MIN) {
      this.stopTimer();
      this.setState({ intervalSeconds });
      this.startTimer();
    }
  }

  handleLimitChange(limit) {
    if (limit >= NRQL_QUERY_LIMIT_MIN && limit <= NRQL_QUERY_LIMIT_MAX) {
      this.setState({ queryLimit: limit });
    }
  }

  /*
   * Global nerdlet menu items
   */
  renderMainMenu() {
    const { dataSource, enabled, intervalSeconds, queryLimit } = this.state;

    return (
      <div className='side-menu'>
        <BlockText type={BlockText.TYPE.NORMAL}>
          <strong>Account</strong>
        </BlockText>
        <AccountDropdown
          className='account-dropdown'
          onSelect={this.handleAccountChange}
          urlState={this.props.nerdletUrlState}
        />
        <BlockText type={BlockText.TYPE.NORMAL}>
          <strong>Source</strong>
        </BlockText>
        <RadioGroup
          className='radio-group'
          name='dataSource'
          onChange={this.handleDataSourceChange}
          selectedValue={dataSource}
        >
          <div className='radio-option'>
            <Radio value='sflow' />
            <label>sflow</label>
          </div>
          <div className='radio-option'>
            <Radio value='ipfix' />
            <label>ipfix</label>
          </div>
        </RadioGroup>
        <br />
        <BlockText type={BlockText.TYPE.NORMAL}>
          <strong>Limit results to...</strong>
        </BlockText>
        <RadioGroup
          className='radio-group'
          name='limit'
          onChange={this.handleLimitChange}
          selectedValue={queryLimit}
        >
          <div className='radio-option'>
            <Radio value={25} />
            <label>25 devices</label>
          </div>
          <div className='radio-option'>
            <Radio value={50} />
            <label>50 devices</label>
          </div>
          <div className='radio-option'>
            <Radio value={100} />
            <label>100 devices</label>
          </div>
        </RadioGroup>
        <br />
        <BlockText type={BlockText.TYPE.NORMAL}>
          <strong>Refresh rate:</strong> {enabled ? intervalSeconds : "Paused"}
        </BlockText>
        <br />
        <span>
          {INTERVAL_SECONDS_MIN}s
          <input
            type='range'
            min={INTERVAL_SECONDS_MIN}
            max={INTERVAL_SECONDS_MAX}
            value={intervalSeconds}
            onChange={this.handleIntervalSecondsChange}
            className='slider'
            id='intervalSeconds'
            step='1'
          />
          {INTERVAL_SECONDS_MAX}s
        </span>
        &nbsp;
        <Button
          onClick={() => this.setState(prevState => ({ enabled: !prevState.enabled }))}
          sizeType={Button.SIZE_TYPE.SLIM}
          iconType={
            this.state.enabled
              ? Button.ICON_TYPE.INTERFACE__STATE__PRIVATE
              : Button.ICON_TYPE.INTERFACE__CARET__CARET_RIGHT__V_ALTERNATE
          }
        />
      </div>
    );
  }

  /*
   * Per data type menu
   */
  renderSubMenu() {
    return <div className='side-menu'>TODO: Sub Menu</div>;
  }

  /*
   * Details on the Right
   */
  renderSummaryInfo() {
    const { nodeSummary } = this.state;

    return <div className='side-info'>TODO: Summary Info</div>;
  }

  /*
   * Main Renderer
   */
  render() {
    const { timeRange } = this.props.launcherUrlState;
    const { account, dataSource, intervalSeconds, isLoading, queryLimit } = this.state;

    return (
      <div className='background'>
        <Grid className='fullheight'>
          <GridItem columnSpan={2}>
            <Stack
              directionType={Stack.DIRECTION_TYPE.VERTICAL}
              alignmentType={Stack.ALIGNMENT_TYPE.FILL}
            >
              <StackItem>{this.renderMainMenu()}</StackItem>
              <StackItem>{this.renderSubMenu()}</StackItem>
            </Stack>
          </GridItem>
          <GridItem columnSpan={7}>
            <div className='main-container'>
              {isLoading ? (
                <Spinner fillContainer />
              ) : dataSource === "sflow" ? (
                <Sflow account={account} queryLimit={queryLimit} timeRange={timeRange} />
              ) : dataSource === "ipfix" ? (
                <Ipfix
                  account={account}
                  intervalSeconds={intervalSeconds}
                  queryLimit={queryLimit}
                />
              ) : (
                <div>Unknown data source</div>
              )}
            </div>
          </GridItem>
          <GridItem columnSpan={3}>{this.renderSummaryInfo()}</GridItem>
        </Grid>
      </div>
    );
  }
}
