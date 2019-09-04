import { BlockText, Icon } from "nr1";
import React from "react";
import { Table } from "semantic-ui-react";
import { bitsToSize } from "../../src/lib/bytes-to-size";

export const renderDeviceHeader = (deviceName, deviceType) => {
  return (
    <table>
      <tbody>
        <tr>
          <td>
            <Icon type={Icon.TYPE.HARDWARE_AND_SOFTWARE__HARDWARE__NETWORK} />
          </td>
          <td>
            <BlockText type={BlockText.TYPE.PARAGRAPH}>{deviceName || "All Devices"}</BlockText>
          </td>
        </tr>
        <tr>
          <td>&nbsp;</td>
          <td>
            <BlockText className='minor-heading' type={BlockText.TYPE.NORMAL}>
              {deviceType || "Device"}
            </BlockText>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

export const renderSummaryInfo = nodes => {
  return (
    <Table compact striped>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>&nbsp;</Table.HeaderCell>
          <Table.HeaderCell>Source</Table.HeaderCell>
          <Table.HeaderCell>Throughput</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {nodes
          .filter(a => a.value > 0)
          .sort((a, b) => (a.value < b.value ? 1 : -1))
          .map((n, k) => (
            <Table.Row key={k}>
              <Table.Cell style={{ color: n.color }}>*</Table.Cell>
              <Table.Cell>{n.name || "(Unknown)"}</Table.Cell>
              <Table.Cell>{bitsToSize(n.value)}</Table.Cell>
            </Table.Row>
          ))}
      </Table.Body>
    </Table>
  );
};
