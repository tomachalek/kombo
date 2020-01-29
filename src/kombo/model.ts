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

import { Subject, Subscription, BehaviorSubject, Observable } from 'rxjs';
import { produce } from 'immer';
import {IEventEmitter, Action, IStateChangeListener, SEDispatcher, IStatelessModel, IReducer, IActionQueue, IFullActionControl, ISideEffectHandler, INewStateReducer} from './main';


export interface IActionCapturer {
    (action:Action):boolean;
}

export interface IActionHandlerModifier {

    reduceAlsoOn(...actions:Array<string>):IActionHandlerModifier;
    sideEffectAlsoOn(...actions:Array<string>):IActionHandlerModifier;

}

/**
 * A general model implementation as viewed from
 * the perspective of a React component.
 */
export interface IModel<T> {

    addListener(fn:IStateChangeListener<T>):Subscription;

    /**
     * For initial state fetching.
     */
    getState():T;
}


/**
 * Stateless model is state-less in a sense that it does not
 * hold its state T and it also cannot decide when the state
 * changes. It just provides reducers and side-effects for
 * dispatched actions.
 *
 * Type T represents a state the model handles. Type U (optional)
 * describes a synchronization value used along with method
 * 'suspend()'.
 */
export abstract class StatelessModel<T extends object, U={}> implements IStatelessModel<T>, IModel<T> {

    private readonly state$:BehaviorSubject<T>;

    private wakeFn:((action:Action, syncData:U)=>U|null)|null;

    private syncData:U;

    private wakeEvents$:Subject<Action>;

    /**
     * A debugging callback for watching action arrival and match process.
     */
    private _onActionMatch:(state:T, action:Action, isMatch:boolean)=>void;

    // TODO make this readonly in the version 1.0.0
    protected actionMatch:{[actionName:string]:IReducer<T, Action>};

    protected readonly sideEffectMatch:{[actionName:string]:ISideEffectHandler<T, Action>};

    constructor(dispatcher:IActionQueue, initialState:T) {
        this.state$ = dispatcher.registerModel(this, initialState);
        this.state$.subscribe(
            undefined,
            (err) => {
                console.error(err)
            }
        );
        this.wakeFn = null;
        this.actionMatch = {};
        this.sideEffectMatch = {};
    }

    /**
     * When relying on default reduce implementation,
     * it is harder to debug action matching process.
     * This function makes such debugging easier.
     */
    DEBUG_onActionMatch(fn:(state:T, action:Action, isMatch:boolean)=>void) {
        this._onActionMatch = fn;
    }

    /**
     * Default reduce implementation uses actionMatch mapping.
     * It is perfectly OK to implement a custom solution here
     * (e.g. using switch) but in most cases, it won't probably
     * provide any advantages.
     */
    reduce(state:T, action:Action):T {
        const match = this.actionMatch[action.name];
        if (!!this._onActionMatch) {
            this._onActionMatch(state, action, !!match);
        }
        return !!match ? match(state, action) : state;
    }

    /**
     * Produce side effects for actions. This can be overridden
     * (and in older versions of Kombo it was the only way how to do
     * this) but it is easier to just use 'addActionHandler()'.
     *
     * @param state
     * @param action
     * @param dispatch
     */
    sideEffects(state:T, action:Action, dispatch:SEDispatcher):void {
        const match = this.sideEffectMatch[action.name];
        if (match !== undefined) {
            match(state, action, dispatch);
        }
    }

    /**
     * Handle action with provided Immer-wrapped reducer (i.e. no need
     * to explicitly copy state and returning the state from the handler).
     * Optionally, produce also a side effect for the same action.
     *
     * @param actionName
     * @param reducer
     * @param seHandler
     */
    addActionHandler<A extends Action>(actionName:string, reducer:INewStateReducer<T, A>|null, seProducer?:ISideEffectHandler<T, A>):IActionHandlerModifier {
        // Here we cheat a bit with types to avoid Immutable<T> type from Immer.
        // Maybe in later versions of Kombo we can force the state type to be Immutable application-wide.
        if (reducer) {
            if (this.actionMatch[actionName] === undefined) {
                this.actionMatch[actionName] = produce(reducer) as IReducer<T, A>;

            } else {
                throw new Error(`Reducer for [${actionName}] already defined.`);
            }
        }
        if (seProducer) {
            if (this.sideEffectMatch[actionName] === undefined) {
                this.sideEffectMatch[actionName] = seProducer;

            } else {
                throw new Error(`Side-effect producer for [${actionName}] already defined.`);
            }
        }
        const modifier = {
            reduceAlsoOn: (...actions:Array<string>) => {
                const reducer = this.actionMatch[actionName];
                if (reducer === undefined) {
                    throw new Error(`Cannot modify action handler - no reducer for action ${actionName}`);
                }
                actions.forEach(a => {
                    this.actionMatch[a] = reducer;
                });
                return modifier;
            },
            sideEffectAlsoOn: (...actions:Array<string>) => {
                const seProducer = this.sideEffectMatch[actionName];
                if (seProducer === undefined) {
                    throw new Error(`Cannot modify action handler - no side-effect producer for action ${actionName}`);
                }
                actions.forEach(a => {
                    this.sideEffectMatch[a] = seProducer;
                })
                return modifier;
            }
        };
        return modifier;
    }

    /**
     * Replaces possible existing action handler.
     * This can be used e.g. when extending an existing model.
     */
    replaceActionHandler<A extends Action>(actionName:string, reducer:INewStateReducer<T, A>|null, seProducer?:ISideEffectHandler<T, A>):IActionHandlerModifier {
        delete this.actionMatch[actionName];
        delete this.sideEffectMatch[actionName];
        return this.addActionHandler(actionName, reducer, seProducer);
    }

    /**
     * Adds model listener. This is typically called in React's componentDidMount.
     * Please note that there is no removeListener. The function returns an Subscription
     * instance you may store and when component is unmounting you can just call
     * .unsubscribe.
     */
    addListener(fn:IStateChangeListener<T>):Subscription {
        return this.state$.subscribe({
            next: fn,
            error: (err) => console.error(err)
        });
    }

    /**
     * suspend method pauses the model right after the action currently processed (i.e. the model
     * does not reduce nor produces any defined side-effects). Each time a subsequent action occurs,
     * wakeFn is called with the action as the first argument and the current syncData as the second
     * argument. The wakeFn may return the following:
     * 1) exactly the same sync. object it recieves (===) => we're not interested in the action at all
     * 2) changed sync. object => we're interested in the action but we need some more actions to complete
     * 3) null => we're interested and also this was the last action so wake up (icluding this action - so
     * the reducer will be applied).
     *
     * @param syncData Synchronization data for multiple action waiting; use {} if not interested
     * @param wakeFn A function called on subsequent actions
     * @returns an observable of Actions producing only Actions we are interested in
     * (see (2) and (3) in the description). This allows building observables based on actions
     * which were occuring during the waiting (sleeping) time.
     */
    suspend(syncData:U, wakeFn:(action:Action, syncData:U)=>U|null):Observable<Action> {
        this.wakeFn = wakeFn;
        this.syncData = syncData;
        this.wakeEvents$ = new Subject<Action>();
        return this.wakeEvents$;
    }

    /**
     * The method is used by Kombo to wake up suspended
     * models.
     *
     * @param action
     */
    wakeUp(action:Action):void {
        if (typeof this.wakeFn === 'function') {
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
     * Get current model state. Kombo uses this method
     * when initializing React components. Please note that
     * for the application logic there should be no need to
     * call this method explicitly (e.g. as a way to exchange
     * data between models). The models should communicate
     * and synchronize themselves via actions and suspend/wake-up.
     */
    getState():T {
        return this.state$.getValue();
    }

    /**
     * @deprecated
     */
    copyState(state:T):T {
        if (typeof Object['assign'] === 'function') {
            return <T>Object['assign']({}, state);

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


/**
 * Stateful model allows impure model implementation where
 * 'state' is represented by whole model object. But Kombo still requires
 * the model to be able to export its state as an object
 * (we try to avoid React component fetching individual state items
 * via model's getters and prefer using 'Bound' wrapper component with
 * automatic mapping of state to properties.
 */
export abstract class StatefulModel<T> implements IEventEmitter, IModel<T> {

    private change$:Subject<T>;

    private dispatcher:IFullActionControl;

    protected state:T;

    constructor(dispatcher:IFullActionControl, initialState:T) {
        this.state = initialState;
        this.change$ = new BehaviorSubject<T>(initialState);
        this.dispatcher = dispatcher;
        this.dispatcher.registerStatefulModel(this);
    }

    addListener(fn:IStateChangeListener<T>):Subscription {
        return this.change$.subscribe(fn);
    }

    emitChange():void {
        this.change$.next(this.getState());
    }

    getState():T {
        return this.state;
    }

    synchronize(action:Action):void {
        this.dispatcher.dispatch({
            isSideEffect:true,
            name: action.name,
            payload: action.payload,
            error: action.error
        });
    }

    abstract onAction(action:Action):void;
}