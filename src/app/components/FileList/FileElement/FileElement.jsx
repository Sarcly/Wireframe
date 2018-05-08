import React from 'react';
import { setDir, renameFile, resetList } from '../../../actions/filepage.actions';
import { connect } from 'react-redux';
import { ContextMenu, MenuItem, ContextMenuTrigger } from 'react-contextmenu';
import styles from './FileElement.scss';
import { DragSource } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend'


const fileDragSource = {
    beginDrag(props) {
        return {

        };
    }
};

function collect(connect, monitor) {
    return {
        connectDragSource: connect.dragSource(),
        isDragging: monitor.isDragging(),
        connectDragPreview: connect.dragPreview()
    }
}

class FileElement extends React.Component {
    constructor(props) {
        super(props);
        this.getSize = this.getSize.bind(this);
    }

    getSize(size) {
        if (size < 1000) {
            return size + " B";
        } else if (size < 100000) {
            return ((Math.round(size / 1000)) + " KB");
        } else if (size < 1000000000) {
            return (Math.round(size / 1000000) + " MB");
        } else if (size < 1000000000000) {
            return (Math.round(size / 1000000000) + " GB");
        } else {
            return undefined;
        }
    }

    componentDidMount() {
        if (this.props.isRenaming.isEditing && this.props.isRenaming._id == file._id) {
            this.filename.focus();
        }
    }

    render() {
        var { file, dispatch } = this.props;
        let { connectDragSource, isDragging, connectDragPreview } = this.props;
        let icon = file.type == 'dir' ? 'far fa-folder' : 'far fa-file';
        let size = this.getSize(file.fileSize);
        var contained = (
            <div onClick={e => {
                switch (file.type) {
                    case 'dir': {
                        var newPath = [...this.props.dir, file.name + '/'];
                        dispatch(setDir(newPath));
                        dispatch(resetList(newPath));
                        break;
                    }
                    case '\'': {
                        var newPath = this.props.dir.splice(0, this.props.dir.length - 1);
                        dispatch(setDir(newPath));
                        dispatch(resetList(newPath));
                        break;
                    }
                    default: {
                        return;
                    }
                }
            }} className={styles.file}>
                <div className={styles.icon}><i className={icon} /></div>
                {this.props.isRenaming.isEditing && this.props.isRenaming._id == file._id
                    ? <form onSubmit={e => {
                        e.preventDefault();
                        this.props.dispatch(renameFile(this.props.dir, file.name, this.filename.value));
                    }} className={styles.form}>
                        <input type="text" placeholder="New Folder" ref={node => this.filename = node} className={styles.textbox} autoFocus />
                    </form>
                    : <div className={styles.text}>{file.name}</div>}
                <div className={styles.text}>{file.type == 'dir' ? '' : size}</div>
                <div className={styles.text}>{file.type == 'dir' ? '' : file.type}</div>
            </div>
        )

        if (!this.props.isDragging) {
            var contained = connectDragSource(contained);
        }
        else {
            // TODO: Make a custom DragLayer so that dragging looks good
        }
        return (
            <ContextMenuTrigger id="element" attributes={{
                className: styles.trigger,
                style: {
                    cursor: this.props.isDragging === true ? 'move' : 'pointer'
                }
            }} collect={() => { return this.props; }} disable={this.props.isDragging}>
                {contained}
            </ContextMenuTrigger>
        )
    }
}

function mapStateToProps(state) {
    return state.fileListReducer
}

var connectedThing = connect(mapStateToProps)(FileElement);

export default DragSource('file', fileDragSource, collect)(connectedThing);
