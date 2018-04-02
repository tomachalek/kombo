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

/// <reference path="../compat.d.ts" />

import * as Rx from '@reactivex/rxjs';
import {IEventEmitter, IReducer, Action, ActionDispatcher, IEventListener, SEDispatcher} from './main';

/**
 * A general model implementation as viewed from
 * the perspective of a React component.
 */
export interface IModel<T> {

    addListener(fn:IEventListener<T>):Rx.Subscription;

    /**
     * For initial state fetching.
     */
    getState():T;
}

/**
 * Stateless model provides a recommended way how to implement
 * application's logic. There is no hardcoded limit how many models
 * and states should be there but some configurations are more
 * suitable for some use-cases then others. Simple applications
 * may prefer single state object while complex ones can be
 * designed in a more decentralized way with several state objects
 * (matching some specific domains) with possible model communication
 * via side-effects handler (.e.g. a model for a "messaging" subsystem
 * may trigger app's "file manager" model to store a message attachment as
 * a side effect).
 */
export abstract class StatelessModel<T extends object> implements IReducer<T>, IModel<T> {

    private state$:Rx.BehaviorSubject<T>;

    constructor(dispatcher:ActionDispatcher, initialState:T) {
        this.state$ = dispatcher.registerReducer(this, initialState);
    }

    abstract reduce(state:T, action:Action):T;

    sideEffects(state:T, action:Action, dispatch:SEDispatcher):void {}

    addListener(fn:IEventListener<T>):Rx.Subscription {
        return this.state$.subscribe({
            next: fn,
            error: (err) => console.error(err)
        });
    }

    getState():T {
        return this.state$.getValue();
    }

    copyState(state:T):T {
        return cloneState(this.getState());
    }
}


/**
 *
 * @param state
 */
export const cloneState = <T extends object>(state:Readonly<T>|T):T => {
    if (Object.assign) {
        return <T>Object.assign({}, state);

    } else {
        const ans:{[key:string]:any} = {};
        for (let p in state) {
            if (state.hasOwnProperty(p)) {
                ans[p] = state[p];
            }
        }
        return <T>ans;
    }
};


/**
 * Stateful model allows impure model implementation where
 * 'state' is represented by whole model object. But Kombo still requires
 * the model to be able to export its state as an object
 * (we try to avoid React component fetching individual state items
 * via model's getters and prefer using 'Bound' wrapper component with
 * automatic mapping of state to properties.
 */
export abstract class StatefulModel<T> implements IEventEmitter, IModel<T> {

    private change$:Rx.Subject<T>;

    addListener(fn:IEventListener<T>):Rx.Subscription {
        return this.change$.subscribe(fn);
    }

    emitChange():void {
        this.change$.next(this.getState());
    }

    abstract getState():T;

    abstract onAction(action:T):void;
}