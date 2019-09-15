import { BlockText, Checkbox, Grid, GridItem, Spinner, nerdlet } from "nr1";
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
import debounce from "lodash/debounce";

const DATA_SOURCES = [
  { component: Ipfix, eventType: "ipfix", name: "ipfix" },
  { component: Sflow, eventType: "sflow", name: "sflow" },
];

export default class NetworkTelemetryNerdlet extends React.Component {
  static propTypes = {
    height: PropTypes.number,
    launcherUrlState: PropTypes.object,
    nerdletUrlState: PropTypes.object,
    width: PropTypes.number,
  };

  constructor(props) {
    super(props);

    const intervalSeconds = this.props.nerdletUrlState.intervalSeconds || INTERVAL_SECONDS_DEFAULT;

    this.state = {
      account: {},
      intervalSlider: intervalSeconds, // Track slider local, value in URL
      isLoading: true,
    };

    this.handleAccountChange = this.handleAccountChange.bind(this);
    this.handleDataSourceChange = this.handleDataSourceChange.bind(this);
    this.handleIntervalSecondsChange = this.handleIntervalSecondsChange.bind(this);
    this.handleLimitChange = this.handleLimitChange.bind(this);
    this.handleHideLabelsChange = this.handleHideLabelsChange.bind(this);
  }

  /*
   * Helper functions
   */
  handleDataSourceChange(dataSource) {
    if (dataSource >= 0) {
      nerdlet.setUrlState({ dataSource });
    }
  }

  async handleAccountChange(account) {
    if (account) {
      this.setState({ account, isLoading: false });
    }
  }

  // Debounce slider changes so we're not hammering queries
  handleIntervalSecondsChange = debounce(value => {
    const intervalSeconds = value || INTERVAL_SECONDS_DEFAULT;

    if (intervalSeconds >= INTERVAL_SECONDS_MIN) {
      nerdlet.setUrlState({ intervalSeconds });
    }
  }, 500);

  handleLimitChange(queryLimit) {
    if (queryLimit >= NRQL_QUERY_LIMIT_MIN && queryLimit <= NRQL_QUERY_LIMIT_MAX) {
      nerdlet.setUrlState({ queryLimit });
    }
  }

  handleHideLabelsChange(evt) {
    const hideLabels = ((evt || {}).target || {}).checked || false;

    nerdlet.setUrlState({ hideLabels });
  }

  accountFilter(account) {
    return DATA_SOURCES.reduce((found, source) => {
      return found || account.reportingEventTypes.includes(source.eventType);
    }, false);
  }

  /*
   * Global nerdlet menu items
   */
  renderMainMenu() {
    const dataSource = this.props.nerdletUrlState.dataSource || 0;
    const queryLimit = this.props.nerdletUrlState.queryLimit || NRQL_QUERY_LIMIT_DEFAULT;
    const hideLabels = this.props.nerdletUrlState.hideLabels || false;
    const { intervalSlider } = this.state;

    return (
      <div className='side-menu'>
        <BlockText type={BlockText.TYPE.NORMAL}>
          <strong>Account</strong>
        </BlockText>
        <AccountDropdown
          accountFilter={this.accountFilter}
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
          {DATA_SOURCES.map((v, i) => (
            <div className='radio-option' key={i}>
              <Radio value={i} />
              <label htmlFor={i}>{v.name}</label>
            </div>
          ))}
        </RadioGroup>
        <br />

        <Checkbox
          checked={hideLabels}
          className='checkbox'
          label='Hide Labels'
          onChange={this.handleHideLabelsChange}
        />
        <br />
        <br />

        <BlockText type={BlockText.TYPE.NORMAL}>
          <strong>Limit results to about...</strong>
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
          <strong>Refresh rate:</strong>
        </BlockText>
        <br />
        <div className='interval-range'>
          <InputRange
            formatLabel={value => `${value}s`}
            maxValue={INTERVAL_SECONDS_MAX}
            minValue={INTERVAL_SECONDS_MIN}
            onChange={intervalSlider => this.setState({ intervalSlider })}
            onChangeComplete={this.handleIntervalSecondsChange}
            step={1}
            value={intervalSlider}
          />
        </div>
      </div>
    );
  }

  /*
   * Main Renderer
   */
  render() {
    const { height } = this.props;
    const { timeRange } = this.props.launcherUrlState;
    const dataSource = this.props.nerdletUrlState.dataSource || 0;
    const hideLabels = this.props.nerdletUrlState.hideLabels || false;
    const { intervalSeconds, queryLimit } = this.props.nerdletUrlState;
    const { account, isLoading } = this.state;

    const DsComponent = (DATA_SOURCES[dataSource] || {}).component; // TODO: || Instructions

    return (
      <div className='background'>
        <Grid className='fullheight'>
          <GridItem columnSpan={2}>{this.renderMainMenu()}</GridItem>
          <GridItem columnSpan={10}>
            <div className='main-container'>
              {isLoading ? (
                <Spinner fillContainer />
              ) : (
                <DsComponent
                  account={account}
                  height={height}
                  hideLabels={hideLabels}
                  intervalSeconds={intervalSeconds || INTERVAL_SECONDS_DEFAULT}
                  queryLimit={queryLimit || NRQL_QUERY_LIMIT_DEFAULT}
                  timeRange={timeRange}
                />
              )}
            </div>
          </GridItem>
        </Grid>
      </div>
    );
  }
}
