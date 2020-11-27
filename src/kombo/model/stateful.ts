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

import { Subject, Subscription, BehaviorSubject, Observable, throwError, of as rxOf, timer } from 'rxjs';
import { concatMap, takeUntil, reduce, map } from 'rxjs/operators';
import { produce, current } from 'immer';
import { IModel, ISuspendable } from './common';
import { IEventEmitter, Action, IStateChangeListener } from '../action/common';
import { IFullActionControl } from '../action';


/**
 * Stateful model allows impure model implementation where
 * 'state' is represented by whole model object. But Kombo still requires
 * the model to be able to export its state as an object
 * (we try to avoid React component fetching individual state items
 * via model's getters and prefer using 'Bound' wrapper component with
 * automatic mapping of state to properties.
 */
export abstract class StatefulModel<T, U={}> implements IEventEmitter, IModel<T>, ISuspendable<U> {

    private change$:Subject<T>;

    private dispatcher:IFullActionControl;

    protected state:T;

    private readonly subscription:Subscription;

    private actionMatch:{[actionName:string]:(action:Action)=>void};

    private wakeFn:((action:Action, syncData:U)=>U|null)|null;

    private syncData:U|null;

    private wakeEvents$:Subject<Action>;


    /**
     * A debugging callback for watching action arrival and match process.
     */
    private _onActionMatch:(action:Action, isMatch:boolean)=>void;

    constructor(dispatcher:IFullActionControl, initialState:T) {
        this.state = initialState;
        this.change$ = new BehaviorSubject<T>(this.state);
        this.dispatcher = dispatcher;
        this.subscription = this.dispatcher.registerStatefulModel(this);
        this.actionMatch = {};
        this.wakeFn = null;
        this.syncData = null;
    }

    /**
     * When relying on default action handling implementation,
     * it is harder to debug action matching process.
     * This function makes such debugging easier.
     */
    DEBUG_onActionMatch(fn:(action:Action, isMatch:boolean)=>void) {
        this._onActionMatch = fn;
    }

    /**
     * Export state using Immer's current().
     * This is only for debugging purposes.
     */
    DEBUG_snapshot<V>(value:V):V {
        return current(value);
    }

    addListener(fn:IStateChangeListener<T>):Subscription {
        return this.change$.subscribe(fn);
    }

    /**
     * Signal to the listeners (typically - React components)
     * that your state has changed.
     */
    emitChange():void {
        this.change$.next(this.state);
    }

    getState():T {
        return this.state;
    }

    /**
     * Change the current state the Immer way
     * and emit change.
     */
    changeState(prod:(draftState:T)=>void):void {
        const oldState = this.state;
        this.state = produce(oldState, prod);
        if (this.state !== oldState) {
            this.emitChange();
        }
    }

    addActionHandler<A extends Action>(actionName:string|Array<string>, handler:(action:A)=>void):void {
        (Array.isArray(actionName) ? actionName : [actionName]).forEach(name => {
            if (this.actionMatch[name] === undefined) {
                this.actionMatch[name] = handler;

            } else {
                throw new Error(`Action handler for [${actionName}] already defined.`);
            }
        });
    }

    addActionSubtypeHandler<A extends Action>(actionName:string|Array<string>, match:(action:A)=>boolean, handler:(action:A)=>void):void {
        (Array.isArray(actionName) ? actionName : [actionName]).forEach(name => {
            if (this.actionMatch[name] === undefined) {
                this.actionMatch[name] = (action:A) => {
                    if (match(action)) {
                        handler(action);
                    }
                };

            } else {
                throw new Error(`Action handler for [${actionName}] already defined.`);
            }
        });
    }

    onAction(action:Action):void {
        const match = this.actionMatch[action.name];
        if (!!this._onActionMatch) {
            this._onActionMatch(action, !!match);
        }
        if (!!match) {
            this.actionMatch[action.name](action);
        }
    }

    /**
     * The suspend() method pauses the model right after the action currently
     * processed (i.e. the model does handle further actions). Each time a subsequent
     * action occurs, wakeFn() is called with the action as the first argument
     * and the current syncData as the second argument. The method returns an
     * Observable producing actions we filter based on values wakeFn returns:
     *
     * 1) exactly the same sync. object it recieves (===) => the model keeps
     *    being suspended and no action is send via returned stream (see return),
     * 2) changed sync. object => the model keeps being suspended and the action
     *    is send via the returned stream,
     * 3) null => the model wakes up and starts to handle actions and side-effects
     *    (including this action)
     *
     * @param timeout number of milliseconds to wait
     * @param syncData Synchronization data for multiple action waiting; use {} if not interested
     * @param wakeFn A function called on subsequent actions
     * @returns an observable of Actions producing only Actions we are interested in
     * (see (2) and (3) in the description). This allows building observables
     * based on actions which were occuring during the waiting (sleeping) time.
     * Please note that the actions in the stream are delayed until the object
     * is woken up again as otherwise it would be possible for a model to dispatch
     * actions.
     */
    suspendWithTimeout(timeout:number, syncData:U, wakeFn:(action:Action, syncData:U)=>U|null):Observable<Action> {
        if (this.wakeFn) {
            return throwError(new Error('The model is already suspended.'));
        }
        this.wakeFn = wakeFn;
        this.syncData = syncData;
        this.wakeEvents$ = new Subject<Action>();
        return this.wakeEvents$.pipe(
            timeout > 0 ?
                takeUntil(
                    timer(timeout).pipe(
                        concatMap(v => throwError(new Error(`Model suspend timeout (${timeout}ms)`)))
                    )
                ) :
                map(v => v),
            reduce<Action, Array<Action>>((acc, action) => acc.concat(action), []), // this produces kind of synchronization time point
            concatMap(actions => rxOf(...actions)) // once suspend is done we can pass the values again
        );
    }

    /**
     * The method is a variant of suspendWithTimeout() which can be used
     * in case its sure a waking action will occur. Otherwise the model
     * will wait indefinitely in the suspended state.
     *
     * @param syncData
     * @param wakeFn
     */
    suspend(syncData:U, wakeFn:(action:Action, syncData:U)=>U|null):Observable<Action> {
        return this.suspendWithTimeout(0, syncData, wakeFn);
    }

    /**
     * The method is used by Kombo to wake up suspended
     * models. For a suspended model, it is called on each action
     * which occurs from then until the model is woken up again.
     *
     * @param action
     */
    wakeUp(action:Action):void {
        if (typeof this.wakeFn === 'function' && this.syncData !== null) {
            try {
                const ans = this.wakeFn(action, this.syncData);
                if (action.error) {
                    this.wakeFn = null;
                    this.wakeEvents$.error(action.error);

                } else if (ans === null) {
                    this.wakeFn = null;
                    this.wakeEvents$.next(action);
                    this.wakeEvents$.complete();

                } else if (ans !== this.syncData) {
                    this.wakeEvents$.next(action);
                    this.syncData = ans;
                }

            } catch (e) {
                this.wakeFn = null;
                this.wakeEvents$.error(e);
            }
        }
    }

    /**
     * Return true if the model is not suspended at the moment.
     */
    isActive():boolean {
        return typeof this.wakeFn !== 'function';
    }

    /**
     *
     */
    unregister():void {
        this.subscription.unsubscribe();
    }
}