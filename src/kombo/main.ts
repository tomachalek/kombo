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
import { StatefulModel } from './model';


export interface Action<T extends {[key:string]:any}={}> {
    type:string;
    payload?:T;
    error?:Error;
    isSideEffect?:boolean;
}


export interface SideEffectAction<T> extends Action<T> {
    isSideEffect:true;
}


export type AnyAction<T> = Action<T> | SideEffectAction<T>;


export interface IEventListener<T> {
    (state?:T):void;
}

export interface SEDispatcher {
    (seAction:Action<{}>):void;
}

export interface IEventEmitter<T={}> {
    addListener(callback:(state?:T)=>void):Rx.Subscription;
    emitChange():void;
}


export interface IReducer<T> {
    reduce(state:T, action:Action<{}>):T;
    sideEffects(state:T, action:Action<{}>, dispatch:(seAction:Action<{}>)=>void):void;
    isActive():boolean;
    wakeUp(action:Action<{}>):void;
}


export namespace ActionHelper {

    export const getPayloadItem = <T>(action:AnyAction<T>, item:string) => {
        return action.payload ? <T>action.payload[item] : undefined;
    };
}

export function isSideEffect(action:AnyAction<{}>):action is SideEffectAction<{}> {
    return !!action.isSideEffect;
};
/**
 *
 */
export class ActionDispatcher {

    private inAction$:Rx.Subject<AnyAction<{}>|Rx.Observable<Action<{}>>>;

    private action$:Rx.Observable<AnyAction<{}>>;

    constructor() {
        this.inAction$ = new Rx.Subject<Action<{}>>();
        this.action$ = this.inAction$.flatMap(v => {
            if (v instanceof Rx.Observable) {
                return v;

            } else {
                return Rx.Observable.from([v]);
            }
        }).share();
        this.dispatch = this.dispatch.bind(this);
    }

    dispatch<T>(action:AnyAction<T>):void {
        this.inAction$.next(action);
    }

    insert<T>(sequence:Rx.Observable<Action<T>>):void {
        this.inAction$.next(sequence);
    }

    registerStatefulModel<T>(model:StatefulModel<T>):Rx.Subscription {
        return this.action$.subscribe(model.onAction.bind(model));
    }

    registerReducer<T>(model:IReducer<T>, initialState:T):Rx.BehaviorSubject<T> {
        const state$ = new Rx.BehaviorSubject(initialState);
        this.action$
            .startWith(null)
            .scan(
                <U>(state:T, action:Action<U>) => {
                    if (action !== null) {
                        model.wakeUp(action);
                        if (model.isActive()) {
                            const newState = model.reduce(state, action);
                            model.sideEffects(
                                newState,
                                action,
                                <V>(seAction:Action<V>) => {
                                    if (action.isSideEffect) {
                                        throw new Error('Nested side-effect not allowed');
                                    }
                                    window.setTimeout(() => {
                                        this.dispatch({
                                            isSideEffect:true,
                                            type: seAction.type,
                                            payload: seAction.payload,
                                            error: seAction.error
                                        });
                                    }, 0);
                                }
                            );
                            return newState;
                        }
                    }
                    return state;
                },
                initialState
            )
            .subscribe(state$);
        return state$;
    }
}
