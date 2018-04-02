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


export interface Action {
    type:string;
    payload?:Error|{[key:string]:any};
    error?:boolean;
    isSideEffect?:boolean;
}


export interface SideEffectAction extends Action {
    isSideEffect:true;
}


export type AnyAction = Action | SideEffectAction;


export interface IEventListener<T> {
    (state?:T):void;
}

export interface SEDispatcher {
    (seAction:Action):void;
}

export interface IEventEmitter<T={}> {
    addListener(callback:(state?:T)=>void):Rx.Subscription;
    emitChange():void;
}


export interface IReducer<T> {
    reduce(state:T, action:Action):T;
    sideEffects(state:T, action:Action, dispatch:(seAction:Action)=>void):void;
    isActive():boolean;
    wakeUp(action:Action):void;
}


export namespace ActionHelper {

    export const getPayloadItem = <T>(action:AnyAction, item:string) => {
        return action.payload ? <T>action.payload[item] : undefined;
    };

    export const isSideEffect = (action:AnyAction) => {
        return !!action.isSideEffect;
    };
}

/**
 *
 */
export class ActionDispatcher {

    private inAction$:Rx.Subject<AnyAction>;

    private action$:Rx.Observable<AnyAction>;

    constructor() {
        this.inAction$ = new Rx.Subject<Action>();
        this.action$ = this.inAction$.flatMap(v => {
            if (v instanceof Rx.Observable) {
                return v;

            } else {
                return Rx.Observable.from([v]);
            }
        }).share();
        this.dispatch = this.dispatch.bind(this);
    }

    dispatch(action:AnyAction):void {
        this.inAction$.next(action);
    }

    registerStatefulModel<T>(model:StatefulModel<T>):Rx.Subscription {
        return this.action$.subscribe(model.onAction.bind(model));
    }

    registerReducer<T>(model:IReducer<T>, initialState:T):Rx.BehaviorSubject<T> {
        const state$ = new Rx.BehaviorSubject(initialState);
        this.action$
            .startWith(null)
            .scan(
                (state:T, action:Action) => {
                    model.wakeUp(action);
                    const newState = action !== null && model.isActive() ?
                            model.reduce(state, action) :
                            state;
                    action !== null && model.isActive() ?
                        model.sideEffects(
                            newState,
                            action,
                            (seAction:Action) => {
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
                        ) :
                        null;
                    return newState;
                },
                initialState
            )
            .subscribe(state$);
        return state$;
    }
}
