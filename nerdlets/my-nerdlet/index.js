import React from 'react';
import PropTypes from 'prop-types';

export default class MyNerdlet extends React.Component {
    static propTypes = {
        nerdletUrlState: PropTypes.object,
        launcherUrlState: PropTypes.object,
        width: PropTypes.number,
        height: PropTypes.number,
    };

    render() {
        return <h1>Hello World!</h1>;
    }
}
