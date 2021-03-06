import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import Home from './pages/Home/Home.jsx';
import { Provider } from 'react-redux';
import store from './store.js';
import User from './pages/User/User.jsx';

export default class App extends React.Component {

    render() {
        return (
            <Provider store={store}>
                <BrowserRouter>
                    <Switch>
                        <Route path='/profile' component={User}/>
                        <Route path ='/*' component={Home}/>
                    </Switch>
                </BrowserRouter>
            </Provider>
        )
    }
}