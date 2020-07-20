import { bitsToSize, intToSize } from '../../src/lib/bytes-to-size';

import IpAddress from './ip-address';
import PropTypes from 'prop-types';
import React from 'react';
import { Table } from 'semantic-ui-react';
import { renderDeviceHeader } from './common';

export default class NetworkSummary extends React.Component {
  static propTypes = {
    columns: PropTypes.array,
    data: PropTypes.array,
    deviceName: PropTypes.string,
    deviceType: PropTypes.string,
    height: PropTypes.number,
    hideLabels: PropTypes.bool,
  };

  static defaultProps = {
    columns: [
      { align: 'center', data: 'color', label: null },
      { align: 'left', data: 'name', label: 'Source' },
      { align: 'right', data: 'value', label: 'Throughput' },
    ],
    data: [],
    deviceName: 'All Devices',
    deviceType: 'Device',
    height: '100%',
    hideLabels: false,
    selectedNodeId: null,
  };

  /*
   * Main render
   */
  render() {
    const { columns, data, deviceName, deviceType, height, hideLabels } = this.props;

    const rows = data
      .filter(a => a.value > 0)
      .sort((a, b) => (a.value < b.value ? 1 : -1))
      .reduce((row, node, idx) => {
        row.push(
          <Table.Row key={idx}>
            {columns.map((c, i) => {
              switch (c.data) {
                case 'color':
                  return (
                    <Table.Cell collapsing key={`${idx}-${i}`}>
                      <div className='color-circle' style={{ backgroundColor: node.color }} />
                    </Table.Cell>
                  );
                case 'value':
                  return (
                    <Table.Cell collapsing key={`${idx}-${i}`} textAlign='right'>
                      {c.type && c.type === 'count'
                        ? intToSize(node.value, hideLabels)
                        : bitsToSize(node.value, hideLabels)}
                    </Table.Cell>
                  );
                default:
                  return (
                    <Table.Cell key={`${idx}-${i}`}>
                      <IpAddress value={node[c.data]} />
                    </Table.Cell>
                  );
              }
            })}
          </Table.Row>
        );

        return row;
      }, []);

    return (
      <div>
        {renderDeviceHeader(deviceName, deviceType)}
        <div className='network-summary' style={{ height }}>
          <Table compact singleLine striped>
            <Table.Header>
              <Table.Row>
                {columns.map((c, i) => (
                  <Table.HeaderCell key={i}>{c.label || ' '}</Table.HeaderCell>
                ))}
              </Table.Row>
            </Table.Header>
            <Table.Body>{rows.map(row => row)}</Table.Body>
          </Table>
        </div>
      </div>
    );
  }
}
