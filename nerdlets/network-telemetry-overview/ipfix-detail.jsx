import { ChartGroup, HeadingText, LineChart, SparklineChart } from 'nr1';

import PropTypes from 'prop-types';
import React from 'react';
import { renderDeviceHeader } from './common';

export default class IpfixDetail extends React.Component {
  static propTypes = {
    accountId: PropTypes.number.isRequired,
    filter: PropTypes.string,
    hideLabels: PropTypes.bool,
    name: PropTypes.string,
  };

  /*
   * Main render
   */
  render() {
    const { accountId, filter, hideLabels, name } = this.props;

    const displayName = hideLabels ? '(redacted)' : name;

    // Kill facets when labels are hidden
    const ChartComponent = hideLabels ? SparklineChart : LineChart;

    const throughputQuery =
      'FROM ipfix' +
      " SELECT sum(octetDeltaCount * 64000) as 'throughput'" +
      (filter || '') +
      ' TIMESERIES';

    const destQuery =
      'FROM ipfix' +
      " SELECT sum(octetDeltaCount * 64000) as 'throughput'" +
      (filter || '') +
      ' FACET destinationIPv4Address ' +
      ' TIMESERIES';

    const protocolQuery =
      'FROM ipfix' +
      " SELECT count(*) as 'flows'" +
      (filter || '') +
      ' FACET cases(' +
      "   WHERE protocolIdentifier = 1 as 'ICMP', " +
      "   WHERE protocolIdentifier = 6 as 'TCP'," +
      "   WHERE protocolIdentifier = 17 as 'UDP'," +
      "   WHERE protocolIdentifier IS NOT NULL as 'other')" +
      ' TIMESERIES';

    return (
      <div className='modal'>
        <ChartGroup>
          {renderDeviceHeader(displayName, 'Network Entity')}
          <HeadingText type={HeadingText.TYPE.HEADING4}>Total Throughput</HeadingText>
          <ChartComponent
            accountId={accountId || null}
            className='side-info-chart'
            query={throughputQuery}
          />

          <HeadingText type={HeadingText.TYPE.HEADING4}>Throughput by Destination IP</HeadingText>
          <ChartComponent
            accountId={accountId || null}
            className='side-info-chart'
            query={destQuery}
          />

          <HeadingText type={HeadingText.TYPE.HEADING4}>Flows by Protocol</HeadingText>
          <ChartComponent
            accountId={accountId || null}
            className='side-info-chart'
            query={protocolQuery}
          />
        </ChartGroup>
      </div>
    );
  }
}
