import { BlockText, Button, Grid, GridItem, Spinner, Stack, StackItem } from "nr1";
import {
  INTERVAL_SECONDS_DEFAULT,
  INTERVAL_SECONDS_MAX,
  INTERVAL_SECONDS_MIN,
  NRQL_QUERY_LIMIT_DEFAULT,
  NRQL_QUERY_LIMIT_MAX,
  NRQL_QUERY_LIMIT_MIN,
} from "./constants";
import { Radio, RadioGroup } from "react-radio-group";

import { AccountDropdown } from "../../src/components/account-dropdown";
import InputRange from "react-input-range";
import Ipfix from "./ipfix";
import PropTypes from "prop-types";
import React from "react";
import Sflow from "./sflow";

export default class NetworkTelemetryNerdlet extends React.Component {
  static propTypes = {
    height: PropTypes.number,
    launcherUrlState: PropTypes.object,
    nerdletUrlState: PropTypes.object,
    width: PropTypes.number,
  };

  constructor(props) {
    super(props);

    this.state = {
      account: {},
      dataSource: "sflow",
      detailPaused: false,
      enabled: false,
      hideDetail: true,
      intervalSeconds: INTERVAL_SECONDS_DEFAULT,
      isLoading: true,
      queryLimit: NRQL_QUERY_LIMIT_DEFAULT,
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

  handleIntervalSecondsChange(value) {
    const intervalSeconds = value || INTERVAL_SECONDS_DEFAULT;

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
            <label htmlFor={"sflow"}>sflow</label>
          </div>
          <div className='radio-option'>
            <Radio value='ipfix' />
            <label htmlFor={"ipfix"}>ipfix</label>
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
            <label htmlFor={"25"}>25 devices</label>
          </div>
          <div className='radio-option'>
            <Radio value={50} />
            <label htmlFor={"50"}>50 devices</label>
          </div>
          <div className='radio-option'>
            <Radio value={100} />
            <label htmlFor={"100"}>100 devices</label>
          </div>
        </RadioGroup>
        <br />
        <BlockText type={BlockText.TYPE.NORMAL}>
          <strong>Refresh:</strong>&nbsp;
          <Button
            iconType={
              enabled
                ? Button.ICON_TYPE.INTERFACE__STATE__PRIVATE
                : Button.ICON_TYPE.INTERFACE__CARET__CARET_RIGHT__V_ALTERNATE
            }
            onClick={() => this.setState(prevState => ({ enabled: !prevState.enabled }))}
            sizeType={Button.SIZE_TYPE.SLIM}
          />
        </BlockText>
        <br />
        <div className='interval-range'>
          <InputRange
            formatLabel={value => `${value}s`}
            maxValue={INTERVAL_SECONDS_MAX}
            minValue={INTERVAL_SECONDS_MIN}
            onChange={intervalSeconds => this.setState({ intervalSeconds })}
            onChangeComplete={this.handleIntervalSecondsChange}
            step={1}
            value={intervalSeconds}
          />
        </div>
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

    return <div className='side-info'>{nodeSummary || "TODO: Summary Info"}</div>;
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
              alignmentType={Stack.ALIGNMENT_TYPE.FILL}
              directionType={Stack.DIRECTION_TYPE.VERTICAL}
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
