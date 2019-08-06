/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {Subscription} from 'rxjs';
import * as React from 'react';
import {IModel} from './model';

/**
 * Bound is a component wrapper mapping a state handled by a IModel
 * to a wrapped component via props.
 *
 * @param wrapped a React component state T will be mapped to
 * @param model a stateless model triggering state change
 */
export const Bound = <T extends object>(wrapped:React.ComponentClass<T>|React.SFC<T>, model:IModel<T>):React.ComponentClass<{}, T> => {

    return class BoundComponent extends React.Component<{}, T> {

        _subscription:Subscription;

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


/**
 * While Bound() creates a completely isolated component connected only with its
 * attached model, BoundWithProps() allows you to pass also properties to the
 * bound component. Please note that both model state and passed props are mixed
 * into props of an inner component with means you have to manage possible
 * key conflicts. In case there are conflicting keys, passed props take precedence
 * over models data.
 */
export const BoundWithProps = <P, S>(wrapped:React.ComponentClass<P & S>|React.SFC<P & S>, model:IModel<S>):React.ComponentClass<P, S> => {

    return class BoundComponent extends React.Component<P, S> {

        _subscription:Subscription;

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

        _handleStoreChange(state:S) {
            this.setState(state);
        }

        render() {
            return React.createElement(wrapped, {...this.state, ...this.props});
        }
    }
}