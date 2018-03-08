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

import * as Rx from '@reactivex/rxjs';
import {IEventEmitter, IReducer, Action, ActionDispatcher, SideEffectHandler, IEventListener} from './main';


export class StatefulModel implements IEventEmitter {

    private change$:Rx.Observable<{}>;


    addListener(fn:IEventListener<{}>):Rx.Subscription {
        return this.change$.subscribe(fn);
    }
}


export abstract class StatelessModel<T> implements IReducer<T>, IEventEmitter {

    private state$:Rx.BehaviorSubject<T>;

    private dispatcher:ActionDispatcher;

    private sideEffects:SideEffectHandler<T>;

    constructor(dispatcher:ActionDispatcher, initialState:T, sideEffects?:SideEffectHandler<T>) {
        this.dispatcher = dispatcher;
        this.sideEffects = sideEffects;
        this.state$ = dispatcher.registerReducer(this, initialState, sideEffects);
    }

    abstract reduce(state:T, action:Action):T;

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
    }
}