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

import * as React from 'react';
import * as Rx from '@reactivex/rxjs';
import {IModel, cloneState} from './model';

/**
 * Bound is a component wrapper mapping a state handled by a IModel
 * to a wrapped component via props.
 *
 * @param wrapped a React component state T will be mapped to
 * @param model a stateless model triggering state change
 */
export const Bound = <T extends object>(wrapped:React.ComponentClass<T>, model:IModel<T>) => {

    return class BoundComponent extends React.Component<{}, T> {

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

/**
 * A state used by an auxiliary model to feed its React component
 * with both its 'own' state and some other ('extended' in a sense)
 * state (accessed by '_' property).
 */
export interface ExtendedState<T> {
    _:T;
}

/**
 * While simple 'Bound' is a preferred way of connecting a component to a model,
 * in some cases it may be easier to have a component which listens for two models:
 * E.g. we have a core functionality represented by state T which allows some
 * customized (e.g. plug-in based) extensions. The state T typically reflects
 * the extension's external behavior (interface) in some way. But a concrete extension
 * will probably need also some internal state which should not be mixed with core
 * functionality of the application.
 *
 * One way of handling this is to make models to communicate via side effects,
 * But this should be rather seen as a communication via lightweight messages
 * (i.e. nothing like "here I react to a side effect by sending others my
 * whole state").
 * Another way is to split a component in two with different model mappings
 * (one listening for changes in core state and one listening to the extension).
 *
 * But sometimes it can be much easier to just listen for changes in both
 * states within a single component.
 *
 * Althought listening for any number of components would be possible too
 * (probably with some type system issues) it is not implemented to prevent
 * messy architectural decisions (you can think of it as an analogy to
 * single vs. multiple inheritance).
 *
 *
 * @param wrapped
 * @param ownModel
 * @param theirModel
 */
export const BoundAux = <T extends object, U extends ExtendedState<T>>(wrapped:React.ComponentClass<U>, ownModel:IModel<U>, theirModel:IModel<T>) => {

    return class BoundComponent extends React.Component<{}, U> {

        _subscription1:Rx.Subscription;

        _subscription2:Rx.Subscription;

        constructor(props) {
            super(props);
            const state = cloneState(ownModel.getState());
            state._ = theirModel.getState();
            this.state = state; // cannot use spread operator at the moment due to TS issue
            this._handleOwnModelChange = this._handleOwnModelChange.bind(this);
            this._handleTheirModelChange = this._handleTheirModelChange.bind(this);
        }

        componentDidMount() {
            this._subscription1 = ownModel.addListener(this._handleOwnModelChange);
            this._subscription2 = theirModel.addListener(this._handleTheirModelChange);
        }

        componentWillUnmount() {
            this._subscription1.unsubscribe();
            this._subscription2.unsubscribe();
        }

        _handleOwnModelChange(state:U):void {
            const newState = cloneState(state);
            newState._ = cloneState(this.state._);
            this.setState(state);
        }

        _handleTheirModelChange(state:T):void {
            const newState = cloneState(this.state);
            newState._ = state;
            this.setState(newState);
        }

        render() {
            return React.createElement(wrapped, this.state);
        }
    }
}