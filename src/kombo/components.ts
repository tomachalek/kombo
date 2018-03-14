import * as React from 'react';
import * as Rx from '@reactivex/rxjs';
import {StatelessModel} from './model';
import { ActionDispatcher } from './main';


export const Connected = <T>(wrapped:React.ComponentClass<T>, model:StatelessModel<T>) => {

    return class ConnectedComponent extends React.Component<{}, T> {

        _subscription:Rx.Subscription;

        constructor(props) {
            super(props);
            this.state = model.getState();
            this._handleStoreChange = this._handleStoreChange.bind(this);
        }

        componentDidMount() {
            this._subscription = model.addListener(this._handleStoreChange);
        }

        componentWillUnmount() {
            this._subscription.unsubscribe();
        }

        _handleStoreChange(state:T) {
            this.setState(state);
        }

        render() {
            return React.createElement(wrapped, this.state);
        }
    }

}