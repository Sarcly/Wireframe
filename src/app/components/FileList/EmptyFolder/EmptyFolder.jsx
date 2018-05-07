import React from 'react';
import { setDir, refreshRequest } from '../../../actions/filepage.actions';
import { connect } from 'react-redux';
import styles from './EmptyFolder.scss';

class EmptyFolder extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        let icon = "far fa-folder";
        let username;
        return (
            <div className={styles.file}>
                <div className={styles.icon}><i className={icon} /></div>
                <div className={styles.text}>
                    <form onSubmit={e=>{
                        console.log(username.value)
                    }}>
                        <input type="text" placeholder="New Folder" ref={node => username = node} className={styles.textbox} />
                    </form>
                </div>
                <div className={styles.text}>{size}</div>
                <div className={styles.text}>{file.type}</div>
            </div>
        )
    }
}

function mapStateToProps(state) {
    return state.fileListReducer
}

const connectedFileElement = connect(mapStateToProps)(EmptyFolder);

export default connectedFileElement;