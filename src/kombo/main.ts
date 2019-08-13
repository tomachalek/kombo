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
import {Subscription, Subject, Observable, BehaviorSubject, of as rxOf, asyncScheduler, isObservable} from 'rxjs';
import {flatMap, share, observeOn, filter, merge, startWith, scan} from 'rxjs/operators';
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
 * Action queue is an abstract type representing a queue of user and async
 * actions. I case of Kombo this is handled by ActionDispatcher but this
 * limited interface prevents programmers from misuse of its full capabilities.
 */
export interface IActionQueue {

    /**
     * Register stateless model to listen for incoming actions
     */
    registerModel<T>(model:IStatelessModel<T>, initialState:T):BehaviorSubject<T>;

    /**
     * Before an action is triggered, run the 'capturer' function with
     * the action as a parameter and pass the action to the queue iff
     * the function returns true.
     *
     * Multiple capturers can be defined per action. In such case
     * all of them must return true to pass the action to the queue.
     */
    captureAction(actionName:string, capturer:IActionCapturer):void;
}

/**
 * IActionDispatcher is an object React components may dispatch
 * actions through.
 */
export interface IActionDispatcher extends IActionQueue {
    dispatch<T extends Action|Observable<Action>>(action:T):void;
}

/**
 * IFullActionControl allows full access to actions - it allows both
 * registering to incoming actions and dispatching new actions.
 * It is meant to be used with stateful and legacy models.
 */
export interface IFullActionControl extends IActionDispatcher {
    registerStatefulModel<T>(model:StatefulModel<T>):Subscription;
    registerActionListener(fn:(action:Action, dispatch:SEDispatcher)=>void):Subscription;
}

/**
 *
 */
export class ActionDispatcher implements IActionDispatcher, IActionQueue, IFullActionControl {

    private inAction$:Subject<Action|Observable<Action>>;

    private action$:Observable<AnyAction<{}>>;

    private inAsync$:Subject<Action>;

    private capturedActions:{[actionName:string]:Array<IActionCapturer>};

    private capturedActions$:Observable<Action<{}>>;

    constructor() {
        this.capturedActions = {};
        this.inAction$ = new Subject<AnyAction<{}>>();
        const flattened$ = this.inAction$.pipe(
            flatMap(v => isObservable(v) ? v : rxOf(v))
        );
        this.action$ = flattened$.pipe(
            filter((v:Action<{}>) => !(v.name in this.capturedActions)),
            share()
        );
        this.capturedActions$ = flattened$.pipe(
            filter(action => action.name in this.capturedActions && this.capturedActions[action.name].every(fn => fn(action))),
            share()
        );

        this.inAsync$ = new Subject<Action>().pipe(
            observeOn(asyncScheduler)) as Subject<Action>;
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
            this.capturedActions[actionName].push(capturer);

        } else {
            this.capturedActions[actionName] = [capturer];
        }
    }

    dispatch<T extends Action|Observable<Action>>(action:T):void {
        this.inAction$.next(action);
    }

    /**
     * Normally, when writing an application from scratch registerActionListener should
     * not be needed. But it can serve well when integrating legacy models.
     */
    registerActionListener(fn:(action:Action, dispatch:SEDispatcher)=>void):Subscription {
        return this.action$.subscribe((a:Action) => fn(a, seAction => this.inAsync$.next(seAction)));
    }

    registerStatefulModel<T>(model:StatefulModel<T>):Subscription {
        return this.action$.subscribe(model.onAction.bind(model));
    }

    registerModel<T>(model:IStatelessModel<T>, initialState:T):BehaviorSubject<T> {
        const state$ = new BehaviorSubject(initialState);
        this.action$.pipe(
            merge(this.capturedActions$),
            startWith(null),
            scan(
                (state:T, action:Action<{}>) => {
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
        ).subscribe(state$);
        return state$;
    }
}
