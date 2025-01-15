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
import { IModel, ISuspendable, ModelActionLoggingArgs, MultipleActions, UnionFromTuple, _payloadFilter } from './common.js';
import { IEventEmitter, Action, IStateChangeListener, ActionPayload } from '../action/common.js';
import { IFullActionControl } from '../action/index.js';



/**
 * Stateful model allows impure model implementation where
 * 'state' is represented by whole model object. But Kombo still requires
 * the model to be able to export its state as an object
 * (we try to avoid React component fetching individual state items
 * via model's getters and prefer using 'Bound' wrapper component with
 * automatic mapping of state to properties.
 */
export abstract class StatefulModel<T extends {}> implements IEventEmitter<T>, IModel<T>, ISuspendable {

    private change$:Subject<T>;

    private dispatcher:IFullActionControl;

    protected state:T;

    private readonly subscription:Subscription;

    private actionMatch:{[actionName:string]:(action:Action)=>void};

    private wakeFn:((action:Action, syncData:unknown)=>unknown|null)|null;

    private syncData:unknown;

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
     * Log all (or all matching if handledOnly is true) actions
     * to console. This is for debugging purposes.
     */
    DEBUG_logActions(args?:ModelActionLoggingArgs):void {
        const {handledOnly, payloadFilter, expandablePayload} = {
            handledOnly: true, payloadFilter: undefined, expandablePayload: true, ... args};
        this._onActionMatch = (a:Action, m:boolean) => {
            if (m || !handledOnly) {
                const aMod = _payloadFilter(a, payloadFilter);
                if (expandablePayload) {
                    console.log(`%c[kombo] %c\Action %c\--> model ${this.constructor.name} (${m ? 'handled' : 'unhandled'}) \n%cname: %c${aMod.name}%c\nerror: %c${aMod.error}`,
                    'color: #ee6015', 'color: #33bb33', 'font-weight: bold', 'color: #aaa; font-weight: normal', 'color: #111111', 'color: #aaaaaa', 'color: #111111');
                    console.log(`payload${payloadFilter ? ' (filtered)' : ''}: `, JSON.parse(JSON.stringify(aMod.payload)));

                } else {
                    console.log(`%c[kombo] %c\Action %c\--> model ${this.constructor.name} (${m ? 'handled' : 'unhandled'}) \n%cname: %c${aMod.name}%c\npayload${payloadFilter ? ' (filtered)' : ''}:\n%c${JSON.stringify(aMod.payload, null, 2)}%c\nerror: %c${aMod.error}`,
                    'color: #ee6015', 'color: #33bb33', 'font-weight: bold', 'color: #aaa; font-weight: normal', 'font-weight: bold', 'color: #aaaaaa', 'color: #111111', 'color: #aaaaaa', 'color: #111111');
                }
            }
        }
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

    /**
     * Add a handler for a specific action
     */
    addActionHandler<A extends Action>(
        action:A|string,
        handler:(action:A)=>void
    ):void {
        const name = typeof action === 'string' ? action : action.name;
        if (this.actionMatch[name] === undefined) {
            this.actionMatch[name] = handler;

        } else {
            throw new Error(`Action handler for [${name}] already defined.`);
        }
    }

    /**
     * This is a multi-action version of addActionHandler
     * @see addActionHandler
     */
    addMultiActionHandler<A extends Array<Action>>(
        actions:MultipleActions<A>,
        handler:(action:UnionFromTuple<MultipleActions<A>>)=>void
    ) {
        actions.forEach(
            item => {
                const name = typeof item === 'string' ? item : item.name;
                if (this.actionMatch[name] === undefined) {
                    this.actionMatch[name] = handler;

                } else {
                    throw new Error(`Action handler for [${name}] already defined.`);
                }
            }
        );
    }

    /**
     * Adds a handler for specific action but the handler will
     * be executed if and only if the `match` function returns true
     * for the obtained action.
     */
    addActionSubtypeHandler<A extends Action>(
        action:A|string,
        match:(action:A)=>boolean,
        handler:(action:A)=>void
    ):void {

        const name = typeof action === 'string' ? action : action.name;
        if (this.actionMatch[name] === undefined) {
            this.actionMatch[name] = (action:A) => {
                if (match(action)) {
                    handler(action);
                }
            };

        } else {
            throw new Error(`Action handler for [${name}] already defined.`);
        }
    }

    /**
     * This is a multi-action version of addActionSubtypeHandler
     * @see addActionSubtypeHandler
     */
    addMultiActionSubtypeHandler<A extends Array<Action>>(
        actions:MultipleActions<A>,
        match:(action:UnionFromTuple<MultipleActions<A>>)=>boolean,
        handler:(action:UnionFromTuple<MultipleActions<A>>)=>void
    ):void {
        actions.forEach(
            item => {
                const name = typeof item === 'string' ? item : item.name;
                if (this.actionMatch[name] === undefined) {
                    this.actionMatch[name] = (action:UnionFromTuple<MultipleActions<A>>) => {
                        if (match(action)) {
                            handler(action);
                        }
                    };

                } else {
                    throw new Error(`Action handler for [${name}] already defined.`);
                }
            }
        );
    }

    /**
     * replaceActionHandler replaces possible existing handler for an action.
     * In case there is no existing handler for the action, the function behaves
     * just like addActionHandler.
    */
    replaceActionHandler<A extends Action>(action:A|string, handler:(action:Action)=>void):void {
        const name = typeof action === 'string' ? action : action.name;
        this.actionMatch[name] = handler;
    }

    /**
     * This is a multi-action version of replaceActionHandler
     * @see replaceActionHandler
     */
    replaceMultiActionHandler<A extends Array<Action>>(
        actions:MultipleActions<A>,
        handler:(action:UnionFromTuple<MultipleActions<A>>)=>void
    ):void {
        actions.forEach(
            item => {
                const name = typeof item === 'string' ? item : item.name;
                this.actionMatch[name] = handler;
            }
        );
    }

    /**
     * extendActionHandler adds another handler for an already handled action. This is suitable
     * mostly for classes inherited from some base class with some predefined handlers.
     * This additional handler is called after the original handler finishes.
     * In case there is no existing handler for the action, the function throws an error.
     */
    extendActionHandler<A extends Action>(action:A|string, handler:(action:A)=>void):void {
        (Array.isArray(action) ? action : [action]).forEach(
            item => {
                const name = typeof item === 'string' ? item : item.name;
                if (this.actionMatch[name] === undefined) {
                    throw new Error(`Cannot extend action handler - no existing handler for ${name}`);
                }
                const curr = this.actionMatch[name];
                this.actionMatch[name] = (action:A) => {
                    curr(action);
                    handler(action);
                }
            }
        );
    }

    /**
     * This is a multi-action variant of the extendActionHandler
     * @see extendActionHandler
     */
    extendMultiActionHandler<A extends Array<Action>>(
        actions:MultipleActions<A>,
        handler:(action:UnionFromTuple<MultipleActions<A>>)=>void
    ):void {
        actions.forEach(
            item => {
                const name = typeof item === 'string' ? item : item.name;
                if (this.actionMatch[name] === undefined) {
                    throw new Error(`Cannot extend action handler - no existing handler for ${name}`);
                }
                const curr = this.actionMatch[name];
                this.actionMatch[name] = (action:UnionFromTuple<MultipleActions<A>>) => {
                    curr(action);
                    handler(action);
                }
            }
        );
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
     * Dispatches a provided action as side effect. This has
     * two main implications:
     * 1) action is dispatched asynchronously
     * 2) action cannot be further chained with other actions
     *
     */
    dispatchSideEffect<T extends Action>(action:T):void;
    dispatchSideEffect<T extends Action>(action:T, error:Error):void;
    dispatchSideEffect<T extends Action<U>, U extends ActionPayload={}>(action:T, payload:U):void;
    dispatchSideEffect<T extends Action<U>, U extends ActionPayload={}>(action:T, payload:U, error:Error):void;
    dispatchSideEffect<T extends Action<U>, U extends ActionPayload={}>(action:T, payloadOrError?:U|Error, error?:Error):void {
        if (error) {
            if (payloadOrError instanceof Error) {
                throw new Error('invalid argument ', payloadOrError);

            } else {
                this.dispatcher.dispatchSideEffect(action, payloadOrError, error);
            }

        } else {
            if (payloadOrError !== undefined) {
                this.dispatcher.dispatchSideEffect(action, payloadOrError);

            } else {
                this.dispatcher.dispatchSideEffect(action);
            }
        }
    }

    /**
     * The waitForActionWithTimeout() method pauses the model right after the action currently
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
     * Please note that to properly wake the model, the action it waits for must
     * be run after the suspend call. In case this is based on user interaction or
     * some async event (AJAX), everything is OK by default. But in case of model
     * synchronization (e.g. when other model provides data for the suspended one)
     * this requires the 'waking' action to be a model side-effect
     * (see StatefulModel.dispatchSideEffect()).
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
    waitForActionWithTimeout<U>(timeout:number, syncData:U, wakeFn:(action:Action, syncData:U)=>U|null):Observable<Action> {
        if (this.wakeFn) {
            return throwError(() => new Error('The model is already waiting for an action.'));
        }
        this.wakeFn = wakeFn;
        this.syncData = syncData;
        this.wakeEvents$ = new Subject<Action>();
        return this.wakeEvents$.pipe(
            timeout > 0 ?
                takeUntil(
                    timer(timeout).pipe(
                        concatMap(v => throwError(() => new Error(`Model action waiting timeout (${timeout}ms)`)))
                    )
                ) :
                map(v => v),
            reduce<Action, Array<Action>>((acc, action) => acc.concat(action), []), // this produces kind of synchronization time point
            concatMap(actions => rxOf(...actions)) // once suspend is done we can pass the values again
        );
    }

    /**
     * The method is a variant of waitForActionWithTimeout() which can be used
     * in case its sure a waking action will occur. Otherwise the model
     * will wait indefinitely in the suspended state.
     *
     * @param syncData
     * @param wakeFn
     */
    waitForAction<U>(syncData:U, wakeFn:(action:Action, syncData:U)=>U|null):Observable<Action> {
        return this.waitForActionWithTimeout(0, syncData, wakeFn);
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
                if (ans === null) { // model is going to wake-up
                    this.wakeFn = null;
                    if (action.error) {
                        this.wakeEvents$.error(action.error);

                    } else {
                        this.wakeEvents$.next(action);
                        this.wakeEvents$.complete();
                    }

                } else if (ans !== this.syncData) { // model keeps sleeping but passes the action
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