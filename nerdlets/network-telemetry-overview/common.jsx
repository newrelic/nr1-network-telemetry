import { BlockText, Icon } from "nr1";
import React from "react";

export const renderDeviceHeader = (deviceName, deviceType) => {
  return (
    <div className='network-summary__header'>
      <Icon type={Icon.TYPE.HARDWARE_AND_SOFTWARE__HARDWARE__NETWORK} />
      <div className='network-summary__header-name'>
        <BlockText type={BlockText.TYPE.PARAGRAPH}>{deviceName || "All Devices"}</BlockText>
        <BlockText className='sub-heading' type={BlockText.TYPE.NORMAL}>
          {deviceType || "Device"}
        </BlockText>
      </div>
    </div>
  );
};
