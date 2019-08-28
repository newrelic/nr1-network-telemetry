import React from "react";
import PropTypes from "prop-types";
import { BlockText, Grid, GridItem, Spinner } from "nr1";
import AccountDropdown from "../../src/components/account-dropdown";

export default class Ipfix extends React.Component {
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
      isLoading: true,
    };

    this.handleAccountChange = this.handleAccountChange.bind(this);
  }

  handleAccountChange(account) {
    if (account) this.setState({ account });
  }

  render() {
    const { isLoading } = this.state;

    return (
      <div className='background'>
        <Grid className='fullheight'>
          <GridItem className='side-menu' columnSpan={2}>
            <BlockText type={BlockText.TYPE.NORMAL}>
              <strong>Account</strong>
            </BlockText>
            <AccountDropdown
              className='account-dropdown'
              onSelect={this.handleAccountChange}
              urlState={this.props.nerdletUrlState}
            />
          </GridItem>
          <GridItem className='chord-container' columnSpan={10}>
            {isLoading ? <Spinner fillContainer /> : null}
          </GridItem>
        </Grid>
      </div>
    );
  }
}
