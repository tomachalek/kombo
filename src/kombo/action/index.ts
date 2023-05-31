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
import { Subscription, Observable, BehaviorSubject, Subject, asapScheduler  } from 'rxjs';
import { scan, filter, share, observeOn, distinctUntilChanged } from 'rxjs/operators';
import { IActionCapturer, IStatelessModel } from '../model/common';
import { Action, SEDispatcher, AnyAction, ActionPayload } from './common';
import { StatefulModel } from '../model/stateful';


/**
 * Action queue is an abstract type representing a queue of user and async
 * actions. I case of Kombo this is handled by ActionDispatcher but this
 * limited interface prevents programmers from misuse of its full capabilities.
 */
export interface IActionQueue {

    /**
     * Register stateless model to listen for incoming actions
     */
    registerModel<T>(model:IStatelessModel<T>, initialState:T):[BehaviorSubject<T>, Subscription];

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
    dispatch<T extends Action>(action:T):void;
    dispatch<T extends Action<U>, U extends ActionPayload>(action:T, error:Error):void;
    dispatch<T extends Action<U>, U extends ActionPayload>(action:T, payload:U):void;
    dispatch<T extends Action<U>, U extends ActionPayload>(action:T, payload:U, error:Error):void;
}

/**
 * IFullActionControl allows full access to actions - it allows both
 * registering to incoming actions and dispatching new actions.
 * It is meant to be used with stateful and legacy models.
 */
export interface IFullActionControl extends IActionDispatcher {

    registerStatefulModel<T extends {}>(model:StatefulModel<T>):Subscription;

    registerActionListener(fn:(action:Action, dispatch:SEDispatcher)=>void):Subscription;

    dispatchSideEffect<T extends Action>(action:T):void;
    dispatchSideEffect<T extends Action>(action:T, error:Error):void;
    dispatchSideEffect<T extends Action<U>, U extends ActionPayload={}>(action:T, payload:U):void;
    dispatchSideEffect<T extends Action<U>, U extends ActionPayload={}>(action:T, payload:U|undefined, error:Error):void;
}

/**
 *
 */
export class ActionDispatcher implements IActionDispatcher, IActionQueue, IFullActionControl {

    private inAction$:Subject<Action|Observable<Action>>;

    private action$:Observable<AnyAction<{}>>;

    private inAsync$:Subject<Action>;

    private capturedActions:{[actionName:string]:Array<IActionCapturer>};

    constructor() {
        this.capturedActions = {};
        this.inAction$ = new Subject<AnyAction<{}>>();
        this.action$ = this.inAction$.pipe(
            filter((act:Action<{}>) => !(act.name in this.capturedActions)
                        || this.capturedActions[act.name].every(fn => fn(act))),
            share()
        );

        this.inAsync$ = new Subject<Action>().pipe(
            observeOn(asapScheduler)
        ) as Subject<Action>;
        this.inAsync$.subscribe(action => {
            this.dispatch({
                ...action,
                isSideEffect: true
            });
        });
    }

    captureAction(actionName:string, capturer:IActionCapturer):void {
        if (actionName in this.capturedActions) {
            this.capturedActions[actionName].push(capturer);

        } else {
            this.capturedActions[actionName] = [capturer];
        }
    }

    dispatch<T extends Action>(action:T):void;
    dispatch<T extends Action<U>, U extends ActionPayload>(action:T, error:Error):void;
    dispatch<T extends Action<U>, U extends ActionPayload>(action:T, payload:U):void;
    dispatch<T extends Action<U>, U extends ActionPayload>(action:T, payload:U, error:Error):void;
    dispatch<T extends Action<U>, U extends ActionPayload>(action:T, payloadOrError?:U|Error, error?:Error):void {
        const payload = payloadOrError instanceof Error ? undefined : payloadOrError;
        const errorResolved = payloadOrError instanceof Error ?
            payloadOrError :
            error ? error : action.error;
        this.inAction$.next({
            name: action.name,
            payload: {...action.payload, ...payload},
            error: errorResolved
        });
    }

    dispatchSideEffect<T extends Action>(action:T):void;
    dispatchSideEffect<T extends Action>(action:T, error:Error):void;
    dispatchSideEffect<T extends Action<U>, U extends ActionPayload={}>(action:T, payload:U):void;
    dispatchSideEffect<T extends Action<U>, U extends ActionPayload={}>(action:T, payload:U, error:Error):void;
    dispatchSideEffect<T extends Action<U>, U extends ActionPayload={}>(action:T, payloadOrError?:U|Error, error?:Error):void {
        const payload = payloadOrError instanceof Error ? undefined : payloadOrError;
        const errorResolved = payloadOrError instanceof Error ?
            payloadOrError :
            error ? error : action.error;
        this.inAsync$.next({
            name: action.name,
            payload: {...action.payload, ...payload},
            error: errorResolved,
            isSideEffect: true
        });
    }

    /**
     * Normally, when writing an application from scratch registerActionListener should
     * not be needed. But it can serve well when integrating legacy models.
     */
    registerActionListener(fn:(action:Action, dispatch:SEDispatcher)=>void):Subscription {
        return this.action$.subscribe((a:Action) => fn(a, seAction => this.inAsync$.next(seAction)));
    }

    registerStatefulModel<T extends {}>(model:StatefulModel<T>):Subscription {
        return this.action$.subscribe({
            next: action => {
                model.wakeUp(action);
                if (model.isActive()) {
                    model.onAction(action);
                }
            },
            error: error => {
                console.error(error);
            }
        });
    }

    registerModel<T>(
        model:IStatelessModel<T>,
        initialState:T
    ):[BehaviorSubject<T>, Subscription] {

        const state$ = new BehaviorSubject(initialState);
        const subscr = this.action$.pipe(
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
                                    <T extends Action<U>, U extends ActionPayload={}>(seAction:T, payloadOrError?:U|Error, error?:Error) => {
                                        const payload = payloadOrError instanceof Error ? undefined : payloadOrError;
                                        const errorResolved = payloadOrError instanceof Error ?
                                            payloadOrError :
                                            error ? error : seAction.error;
                                        this.inAsync$.next({
                                            name: seAction.name,
                                            payload: {...seAction.payload, ...payload},
                                            error: errorResolved
                                        });
                                    }
                                );
                            }
                            return newState;
                        }
                    }
                    return state;
                },
                initialState
            ),
            distinctUntilChanged()
        ).subscribe(state$);
        return [state$, subscr];
    }
}