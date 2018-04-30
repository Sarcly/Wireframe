import React from 'react';
import styles from './Home.scss';
import MasterLayout from '../../layouts/MasterLayout/MasterLayout.jsx';
import Particle from '../../components/Particle/Particle.jsx';
import LoginContainer from '../../components/LoginContainer/LoginContainer.jsx';
import ReactSVG from 'react-svg';

export default class Home extends React.Component {
    render() {
        return (
            <MasterLayout>
                <div className={styles.top}>
                    <Particle />
                    <div className={styles.content}>
                        <div className={styles.container}>
                            <div className={styles.logo}>
                                <svg path="logo/Wireframe-Full.svg" height="300" width="200" viewBox="0 0 300 200" preserveAspectRatio="none"/>
                            </div>
                            <div className={styles.login}>
                                <LoginContainer/>
                            </div>
                        </div>
                    </div>
                </div>
            </MasterLayout>
        )
    }
}