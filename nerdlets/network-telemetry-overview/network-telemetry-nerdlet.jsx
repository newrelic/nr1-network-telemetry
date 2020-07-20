import {
  Grid,
  GridItem,
  HeadingText,
  Icon,
  NerdletStateContext,
  PlatformStateContext,
  Spinner,
} from 'nr1';
import { EmptyState } from '@newrelic/nr1-community';
import { DATA_SOURCES, INTERVAL_SECONDS_DEFAULT, NRQL_QUERY_LIMIT_DEFAULT } from './constants';
import MainMenu from './MainMenu';

import React from 'react';

export default class NetworkTelemetryNerdlet extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      account: {},
      accountsList: [],
      isLoading: true,
    };
  }

  handleAccountsLoaded = accountsList => {
    if (accountsList && accountsList.length < 0) {
      this.setState({ accountsList });
    }
  };

  accountFilter(account) {
    return DATA_SOURCES.reduce((found, source) => {
      return found || account.reportingEventTypes.includes(source.eventType);
    }, false);
  }

  renderSelectAccountAlert = () => {
    return (
      <div className='select-account'>
        <HeadingText type={HeadingText.TYPE.HEADING_1}>
          <Icon sizeType={Icon.SIZE_TYPE.LARGE} type={Icon.TYPE.INTERFACE__ARROW__ARROW_LEFT} />
          Please Select an Account
        </HeadingText>
      </div>
    );
  };

  renderDSComponent = () => {
    const { account } = this.state;
    return (
      <PlatformStateContext.Consumer>
        {platformUrlState => {
          const { timeRange } = platformUrlState;
          return (
            <NerdletStateContext.Consumer>
              {nerdletUrlState => {
                const {
                  dataSource = 0,
                  hideLabels = false,
                  intervalSeconds,
                  queryLimit,
                } = nerdletUrlState;
                const DsComponent = (DATA_SOURCES[dataSource] || {}).component;
                return (
                  <DsComponent
                    account={account}
                    hideLabels={hideLabels}
                    intervalSeconds={intervalSeconds || INTERVAL_SECONDS_DEFAULT}
                    queryLimit={queryLimit || NRQL_QUERY_LIMIT_DEFAULT}
                    timeRange={timeRange}
                  />
                );
              }}
            </NerdletStateContext.Consumer>
          );
        }}
      </PlatformStateContext.Consumer>
    );
  };

  renderAccountsListError = () => {
    return (
      <EmptyState
        buttonText=''
        description={
          'No accounts found for this Nerdpack or for your user. See your Nerdpack Manager with concerns.'
        }
        heading={'No Accounts Found'}
      />
    );
  };

  render() {
    const { account, isLoading, accountsList } = this.state;

    return (
      <div className='background'>
        <Grid className='fullheight'>
          <GridItem columnSpan={2}>
            <NerdletStateContext.Consumer>
              {nerdletUrlState => (
                <MainMenu
                  nerdletUrlState={nerdletUrlState}
                  onAccountChange={account => this.setState({ account, isLoading: false })}
                />
              )}
            </NerdletStateContext.Consumer>
          </GridItem>
          <GridItem columnSpan={10}>
            <div className='main-container'>
              {isLoading && account.id && <Spinner fillContainer />}
              {!account.id && accountsList.length > 0 && this.renderSelectAccountAlert()}
              {!account.id &&
                accountsList.length === 0 &&
                !isLoading &&
                this.renderAccountsListError()}
              {!isLoading && account.id && this.renderDSComponent()}
            </div>
          </GridItem>
        </Grid>
      </div>
    );
  }
}
