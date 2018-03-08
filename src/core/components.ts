import * as React from 'react';
import * as Rx from '@reactivex/rxjs';
import {StatelessModel} from './model';
import { ActionDispatcher } from './main';


export const cloneState = <T>(obj:Readonly<T>):T => {
    if (Object.assign) {
        return <T>Object.assign({}, obj);

    } else {
        const ans:{[key:string]:any} = {};
        for (let p in obj) {
            if (obj.hasOwnProperty(p)) {
                ans[p] = obj[p];
            }
        }
        return <T>ans;
    }
}


export const Connected = <T>(wrapped:React.ComponentClass<T>, model:StatelessModel<T>) => {

    return class ConnectedComponent extends React.Component<{}, T> {

        private subscription:Rx.Subscription;

        constructor(props) {
            super(props);
            this.state = model.getState();
            this.handleStoreChange = this.handleStoreChange.bind(this);
        }

        componentDidMount() {
            // this was written by my 6 moth son; don't know the meaning yet but
            // I'll rather keep it here:
            // sxdxsdxc/ds/xxdfcfrfgk oc xzrr eed  hj nm,//////////////x55tr55r54tr5 r5 ycxdcxddcxdwwxsq
            this.subscription = model.addListener(this.handleStoreChange);
        }

        componentWillUnmount() {
            this.subscription.unsubscribe();
        }

        private handleStoreChange(state:T) {
            this.setState(state);
        }

        render() {
            return React.createElement(wrapped, this.state);
        }
    }

}