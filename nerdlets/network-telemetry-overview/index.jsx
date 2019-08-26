import PropTypes from "prop-types";
import React from "react";

export default class MyNerdlet extends React.Component {
  static propTypes = {
    height: PropTypes.number,
    launcherUrlState: PropTypes.object,
    nerdletUrlState: PropTypes.object,
    width: PropTypes.number,
  };

  render() {
    return <h1>Hello World!</h1>;
  }
}
