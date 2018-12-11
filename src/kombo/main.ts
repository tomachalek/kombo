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


export interface Action<T extends string=string, U extends {[key:string]:any}={}> {
    type:T;
    payload?:U;
    error?:Error;
    isSideEffect?:boolean;
}


export interface SideEffectAction<T extends string, U> extends Action<T, U> {
    isSideEffect:true;
}


export type AnyAction<T extends string, U> = Action<T, U> | SideEffectAction<T, U>;


export interface IEventListener<T> {
    (state?:T):void;
}


export interface IEventEmitter<T={}> {
    addListener(callback:(state?:T)=>void):Rx.Subscription;
    emitChange():void;
}

export interface IReducer<T> {
    reduce(state:T, action:Action<string, {}>):T;
    sideEffects(state:T, action:Action<string, {}>, dispatch:SEDispatcher):void;
    isActive():boolean;
    wakeUp(action:Action<string, {}>):void;
}

export interface SEDispatcher {
    <T extends Action<string, {}>|Rx.Observable<Action<string, {}>>>(seAction:T):void;
}

export namespace ActionHelper {

    export const getPayloadItem = <T>(action:AnyAction<string, T>, item:string) => {
        return action.payload ? <T>action.payload[item] : undefined;
    };
}

export function isSideEffect(action:AnyAction<string, {}>):action is SideEffectAction<string, {}> {
    return !!action.isSideEffect;
};
/**
 *
 */
export class ActionDispatcher {

    private inAsync$:Rx.Subject<Action<string, {}>|Rx.Observable<Action<string, {}>>>;

    private inAction$:Rx.Subject<AnyAction<string, {}>>;

    private action$:Rx.Observable<AnyAction<string, {}>>;

    constructor() {
        this.inAction$ = new Rx.Subject<AnyAction<string, {}>>();
        this.action$ = this.inAction$.share();
        this.inAsync$ = new Rx.Subject<Action<string, {}>>();
        this.inAsync$.flatMap(v => {
            if (v instanceof Rx.Observable) {
                return v;

            } else {
                return Rx.Observable.of(v);
            }
        })
        .observeOn(Rx.Scheduler.async)
        .subscribe(action => {
            this.dispatch({
                isSideEffect:true,
                type: action.type,
                payload: action.payload,
                error: action.error
            });
        });
        this.dispatch = this.dispatch.bind(this);
    }

    dispatch<T extends Action<string, {}>>(action:T):void {
        this.inAction$.next(action);
    }

    attach$<T extends string, U>(stream:Rx.Observable<SideEffectAction<T, U>>):void {
        this.inAsync$.next(stream);
    }

    registerStatefulModel<T>(model:StatefulModel<T>):Rx.Subscription {
        return this.action$.subscribe(model.onAction.bind(model));
    }

    registerReducer<T>(model:IReducer<T>, initialState:T):Rx.BehaviorSubject<T> {
        const state$ = new Rx.BehaviorSubject(initialState);
        this.action$
            .startWith(null)
            .scan(
                <U>(state:T, action:Action<string, U>) => {
                    if (action !== null) {
                        model.wakeUp(action);
                        if (model.isActive()) {
                            const newState = model.reduce(state, action);
                            model.sideEffects(
                                newState,
                                action,
                                (evt) => this.inAsync$.next(evt)
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
