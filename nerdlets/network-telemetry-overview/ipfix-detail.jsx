import { ChartGroup, HeadingText, LineChart } from "nr1";

import { NRQL_IPFIX_WHERE } from "./constants";
import PropTypes from "prop-types";
import React from "react";
import { renderDeviceHeader } from "./common";

export default class IpfixDetail extends React.Component {
  static propTypes = {
    accountId: PropTypes.number.isRequired,
    filter: PropTypes.string,
    name: PropTypes.string,
  };

  /*
   * Main render
   */
  render() {
    const { accountId, filter, name } = this.props;

    const throughputQuery =
      "FROM ipfix" +
      " SELECT sum(octetDeltaCount * 64000) as 'throughput'" +
      NRQL_IPFIX_WHERE +
      (filter || "") +
      " TIMESERIES";

    const destQuery =
      "FROM ipfix" +
      " SELECT sum(octetDeltaCount * 64000) as 'throughput'" +
      NRQL_IPFIX_WHERE +
      (filter || "") +
      " FACET destinationIPv4Address " +
      " TIMESERIES";

    const protocolQuery =
      "FROM ipfix" +
      " SELECT count(*) as 'flows'" +
      NRQL_IPFIX_WHERE +
      (filter || "") +
      " FACET cases(" +
      "   WHERE protocolIdentifier = 1 as 'ICMP', " +
      "   WHERE protocolIdentifier = 6 as 'TCP'," +
      "   WHERE protocolIdentifier = 17 as 'UDP'," +
      "   WHERE protocolIdentifier IS NOT NULL as 'other')" +
      " TIMESERIES";

    return (
      <div className='modal'>
        <ChartGroup>
          {renderDeviceHeader(name, "Network Entity")}
          <HeadingText type={HeadingText.TYPE.HEADING4}>Total Throughput</HeadingText>
          <LineChart
            accountId={accountId || null}
            className='side-info-chart'
            query={throughputQuery}
          />
          <HeadingText type={HeadingText.TYPE.HEADING4}>Throughput by Destination IP</HeadingText>
          <LineChart accountId={accountId || null} className='side-info-chart' query={destQuery} />
          <HeadingText type={HeadingText.TYPE.HEADING4}>Flows by Protocol</HeadingText>
          <LineChart
            accountId={accountId || null}
            className='side-info-chart'
            query={protocolQuery}
          />
        </ChartGroup>
      </div>
    );
  }
}
