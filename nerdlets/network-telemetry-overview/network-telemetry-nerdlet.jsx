import {
  Grid,
  GridItem,
  HeadingText,
  Icon,
  NerdletStateContext,
  Spinner,
  nerdlet
} from "nr1";
import {
  DATA_SOURCES,
  NRQL_QUERY_LIMIT_MAX,
  NRQL_QUERY_LIMIT_MIN,
} from "./constants";
import MainMenu from './MainMenu';

import React from "react";

export default class NetworkTelemetryNerdlet extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      account: {},
      isLoading: true,
    };

    this.handleLimitChange = this.handleLimitChange.bind(this);
    this.handleHideLabelsChange = this.handleHideLabelsChange.bind(this);
  }

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

  accountFilter(account) {
    return DATA_SOURCES.reduce((found, source) => {
      return found || account.reportingEventTypes.includes(source.eventType);
    }, false);
  }

  render() {
    const { account, isLoading } = this.state;

    return (
      <div className='background'>
        <Grid className='fullheight'>
          <GridItem columnSpan={2}>
            <NerdletStateContext.Consumer>
              { nerdletUrlState => (
                <MainMenu nerdletUrlState={nerdletUrlState} onAccountChange={account => this.setState({ account, isLoading: false })} />
              ) }
            </NerdletStateContext.Consumer>
          </GridItem>
          <GridItem columnSpan={10}>
            <div className='main-container'>
              {isLoading ? (
                !account.id ? (
                  <div className='select-account'>
                    <HeadingText type={HeadingText.TYPE.HEADING_1}>
                      <Icon
                        sizeType={Icon.SIZE_TYPE.LARGE}
                        type={Icon.TYPE.INTERFACE__ARROW__ARROW_LEFT}
                      />
                      Please Select an Account
                    </HeadingText>
                  </div>
                ) : (
                  <Spinner fillContainer />
                )
              ) : (
                <NerdletStateContext.Consumer>
                  {nerdletUrlState => {
                    const DsComponent = (DATA_SOURCES[nerdletUrlState.dataSource] || {}).component;
                    return <DsComponent />
                  }
                  }
                </NerdletStateContext.Consumer>
              )}
            </div>
          </GridItem>
        </Grid>
      </div>
    );
  }
}