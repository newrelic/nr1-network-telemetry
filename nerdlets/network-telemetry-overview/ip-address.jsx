import { Toast, navigation } from "nr1";
import PropTypes from "prop-types";
import React from "react";

import findRelatedAccountsWith from "../../src/lib/find-related-account-with";
import nrdbQuery from "../../src/lib/nrdb-query";

/**
 * render an ip address that on click will attempt to find the
 * host associated with it. Look at NetworkSample event data
 * and search across all accounts.
 */
export default class IpAddress extends React.Component {
  static propTypes = {
    value: PropTypes.string,
  };

  constructor(props) {
    super(props);

    this.onClick = this.onClick.bind(this);
  }

  async onClick() {
    const ipAddress = this.props.value;
    const { searching } = this.state || {};
    if (!ipAddress || searching) return;

    this.setState({ searching: true });
    const where = `ipV4Address LIKE '${ipAddress}/%'`;
    const notFoundToast = {
      description: `Could not find ${ipAddress} on any monitored hosts.`,
      title: "IP Address Not Found",
      type: Toast.TYPE.NORMAL,
    };

    const accounts = await findRelatedAccountsWith({ eventType: "NetworkSample", where });
    if (accounts.length === 0) {
      Toast.showToast(notFoundToast);
    } else {
      const account = accounts[0];
      const nrql = `SELECT latest(entityGuid) as entityGuid FROM NetworkSample WHERE ${where} SINCE 2 minutes ago`;
      const results = await nrdbQuery(account.id, nrql);
      if (results && results.length > 0 && results[0].entityGuid) {
        navigation.openStackedEntity(results[0].entityGuid);
      } else {
        Toast.showToast(notFoundToast);
      }
    }
    this.setState({ searching: false });
  }

  render() {
    const { searching } = this.state || {};
    const className = searching ? "ip-address-searching" : "ip-address";
    return (
      <div
        className={className}
        onClick={this.onClick}
        onKeyPress={this.onClick}
        role='button'
        tabIndex={0}
      >
        {this.props.value || "(unknown)"}
      </div>
    );
  }
}
