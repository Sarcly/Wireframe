import React from 'react';
import styles from './MasterLayout.scss';
import {connect} from 'react-redux';
import {authenticate} from '../../actions/user.actions';
import {Redirect} from 'react-router-dom';

class MasterLayout extends React.Component {

    constructor(props){
        super(props);
        console.log('props on construction')
        console.log(props)
    }

    componentWillMount(){  
        if(this.props.jwt && this.props.authenticated===null){
            this.props.dispatch(authenticate(this.props.jwt));
        }
    }

    render() {
        if(this.props.authenticated===false && !this.props.auth_pending || localStorage.getItem('token')==null){
            console.log('sending you back b/c');
            console.log(this.props);
            if(this.props.location && this.props.location.pathname!='/') return <Redirect to='/'/>
            else console.log(this.props);
        }
        return (
            <div>
                <header>
                    <nav className={styles.header}>
                        <div className={styles.logo}>
                            <img src='/Logo\Wireframe-Letter.svg' width='100' height='60'/>
                        </div>
                        <div className={styles.links}>
                            
                        </div>
                        <div className={styles.logout} >

                        </div>
                    </nav>
                </header>
                <div className={styles.content}>
                    {this.props.children}
                </div>
            </div>
        )
    }
}

function mapStateToProps(state){
    return state.userReducer;
}

export default connect(mapStateToProps)(MasterLayout);