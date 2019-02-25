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
import {Subscription, Subject, Observable, Scheduler, BehaviorSubject} from 'rxjs';
import { StatefulModel, IActionCapturer } from './model';


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
    addListener(callback:(state?:T)=>void):Subscription;
    emitChange():void;
}

export interface IReducer<T, U extends Action> {
    (state:T, action:U):T;
}

export interface IStatelessModel<T> {
    reduce:IReducer<T, Action>;
    sideEffects(state:T, action:Action, dispatch:SEDispatcher):void;
    isActive():boolean;
    wakeUp(action:Action):void;
}

export interface SEDispatcher {
    <T extends Action>(seAction:T):void;
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

    private inAction$:Subject<Action|Observable<Action>>;

    private action$:Observable<AnyAction<{}>>;

    private inAsync$:Subject<Action>;

    private capturedActions:{[actionName:string]:IActionCapturer};

    private capturedActions$:Observable<Action<{}>>;

    constructor() {
        this.capturedActions = {};
        this.inAction$ = new Subject<AnyAction<{}>>();
        const flattened$ = this.inAction$.flatMap(v => v instanceof Observable ? v : Observable.of(v));
        this.action$ = flattened$
            .filter(v => !(v.name in this.capturedActions))
            .share();
        this.capturedActions$ = flattened$
            .filter(action => action.name in this.capturedActions && this.capturedActions[action.name](action))
            .share();

        this.inAsync$ = new Subject<Action>().observeOn(Scheduler.async) as Subject<Action>;
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

    captureAction(actionName:string, capturer:IActionCapturer):void {
        if (actionName in this.capturedActions) {
            throw new Error(`Action ${actionName} already captured`);

        } else {
            this.capturedActions[actionName] = capturer;
        }
    }

    dispatch<T extends Action|Observable<Action>>(action:T):void {
        this.inAction$.next(action);
    }

    registerStatefulModel<T>(model:StatefulModel<T>):Subscription {
        return this.action$.subscribe(model.onAction.bind(model));
    }

    registerModel<T>(model:IStatelessModel<T>, initialState:T):BehaviorSubject<T> {
        const state$ = new BehaviorSubject(initialState);
        const actions$ = this.action$.merge(this.capturedActions$);
        actions$
            .startWith(null)
            .scan(
                <U>(state:T, action:Action<U>) => {
                    if (action !== null) {
                        model.wakeUp(action);
                        if (model.isActive()) {
                            const newState = model.reduce(state, action);
                            if (!action.isSideEffect) {
                                model.sideEffects(
                                    newState,
                                    action,
                                    seAction => this.inAsync$.next(seAction)
                                );
                            }
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
