import { BlockText, Icon } from "nr1";
import React from "react";

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
