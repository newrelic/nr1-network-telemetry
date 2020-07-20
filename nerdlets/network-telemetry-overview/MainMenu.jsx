import { BlockText, Button, Checkbox, Radio, RadioGroup, nerdlet } from 'nr1';
import { AccountDropdown } from '../../src/components/account-dropdown';
import {
  DATA_SOURCES,
  INTERVAL_SECONDS_DEFAULT,
  INTERVAL_SECONDS_MAX,
  INTERVAL_SECONDS_MIN,
  NRQL_QUERY_LIMIT_DEFAULT,
  NRQL_QUERY_LIMIT_MAX,
  NRQL_QUERY_LIMIT_MIN,
} from './constants';
import InputRange from 'react-input-range';
import PropTypes from 'prop-types';
import React from 'react';
import debounce from 'lodash/debounce';

export default class MainMenu extends React.Component {
  static propTypes = {
    nerdletUrlState: PropTypes.object,
    onAccountChange: PropTypes.func,
    onAccountsLoaded: PropTypes.func,
  };

  constructor(props) {
    super();

    const intervalSeconds = props.nerdletUrlState.intervalSeconds || INTERVAL_SECONDS_DEFAULT;

    this.state = {
      intervalSlider: intervalSeconds,
      isLoading: true,
      intervalEnabled: true,
    };
  }

  handleDataSourceChange = (evt, value) => {
    const dataSource = parseInt(value, 10);
    nerdlet.setUrlState({ dataSource });
  };

  toggleInterval = () => {
    const { intervalEnabled } = this.state;

    if (intervalEnabled) {
      nerdlet.setUrlState({ intervalSeconds: 0 });
    } else {
      nerdlet.setUrlState({ intervalSeconds: INTERVAL_SECONDS_DEFAULT });
    }
    this.setState({ intervalEnabled: !intervalEnabled });
  };

  handleIntervalSecondsChange = debounce(value => {
    const intervalSeconds = value || INTERVAL_SECONDS_DEFAULT;

    if (intervalSeconds >= INTERVAL_SECONDS_MIN) {
      nerdlet.setUrlState({ intervalSeconds });
    }
  }, 500);

  handleAccountChange = async account => {
    if (account) {
      this.props.onAccountChange(account);
    }
  };

  handleLimitChange(evt, value) {
    const queryLimit = parseInt(value, 10);

    if (queryLimit >= NRQL_QUERY_LIMIT_MIN && queryLimit <= NRQL_QUERY_LIMIT_MAX) {
      nerdlet.setUrlState({ queryLimit });
    }
  }

  handleHideLabelsChange(evt) {
    const hideLabels = ((evt || {}).target || {}).checked || false;

    nerdlet.setUrlState({ hideLabels });
  }

  render() {
    const {
      dataSource = 0,
      queryLimit = NRQL_QUERY_LIMIT_DEFAULT,
      hideLabels = false,
    } = this.props.nerdletUrlState;
    const { nerdletUrlState, onAccountsLoaded } = this.props;
    const { intervalSlider, intervalEnabled } = this.state;

    return (
      <div className='side-menu'>
        <BlockText type={BlockText.TYPE.NORMAL}>
          <strong>Account</strong>
        </BlockText>
        <AccountDropdown
          accountFilter={this.accountFilter}
          className='account-dropdown'
          onLoaded={onAccountsLoaded}
          onSelect={this.handleAccountChange}
          urlState={nerdletUrlState}
        />
        <BlockText type={BlockText.TYPE.NORMAL}>
          <strong>Source</strong>
        </BlockText>
        <RadioGroup onChange={this.handleDataSourceChange} value={`${dataSource}`}>
          {DATA_SOURCES.map((v, i) => (
            <Radio key={i} label={v.name} value={`${i}`} />
          ))}
        </RadioGroup>
        <br />

        <Checkbox
          checked={hideLabels}
          className='checkbox'
          label='Hide Labels'
          onChange={this.handleHideLabelsChange}
        />

        <BlockText type={BlockText.TYPE.NORMAL}>
          <strong>Limit results to about...</strong>
        </BlockText>
        <RadioGroup onChange={this.handleLimitChange} value={`${queryLimit}`}>
          <Radio label='25 devices' value='25' />
          <Radio label='50 devices' value='50' />
          <Radio label='100 devices' value='100' />
        </RadioGroup>
        <br />
        {intervalEnabled && (
          <>
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
          </>
        )}

        <Button
          iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__REFRESH}
          onClick={this.toggleInterval}
          type={Button.TYPE.PRIMARY}
        >
          {intervalEnabled ? 'Disable refreshing' : 'Enable refreshing'}
        </Button>
      </div>
    );
  }
}
