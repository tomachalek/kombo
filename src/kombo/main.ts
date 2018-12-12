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
    name:string;
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


export interface IEventEmitter<T={}> {
    addListener(callback:(state?:T)=>void):Rx.Subscription;
    emitChange():void;
}

export interface IReducer<T> {
    reduce(state:T, action:Action):T;
    sideEffects(state:T, action:Action, dispatch:SEDispatcher):void;
    isActive():boolean;
    wakeUp(action:Action):void;
}

export interface SEDispatcher {
    <T>(seAction:Action<T>):void;
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

    private inAction$:Rx.Subject<Action|Rx.Observable<Action>>;

    private action$:Rx.Observable<AnyAction<{}>>;

    private inAsync$:Rx.Subject<Action>;

    constructor() {
        this.inAction$ = new Rx.Subject<AnyAction<{}>>();
        this.action$ = this.inAction$
            .flatMap(v => v instanceof Rx.Observable ? v : Rx.Observable.of(v))
            .share();

        this.inAsync$ = new Rx.Subject<Action>().observeOn(Rx.Scheduler.async) as Rx.Subject<Action>;
        this.inAsync$.subscribe(action => {
            this.dispatch({
                isSideEffect:true,
                name: action.name,
                payload: action.payload,
                error: action.error
            });
        });
        this.dispatch = this.dispatch.bind(this);
    }

    dispatch<T extends Action|Rx.Observable<Action>>(action:T):void {
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
                <U>(state:T, action:Action<U>) => {
                    if (action !== null) {
                        model.wakeUp(action);
                        if (model.isActive()) {
                            const newState = model.reduce(state, action);
                            model.sideEffects(
                                newState,
                                action,
                                (seAction) => this.inAsync$.next(seAction)
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
