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

import { Subject, Subscription, BehaviorSubject } from 'rxjs';
import { produce } from 'immer';
import {IEventEmitter, Action, IStateChangeListener, SEDispatcher, IStatelessModel, IReducer, IActionQueue, IFullActionControl, ISideEffectHandler, INewStateReducer} from './main';


export interface IActionCapturer {
    (action:Action):boolean;
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
 * Stateless model provides a recommended way how to implement
 * application's logic. There is no hardcoded limit how many models
 * and states should be there but some configurations are more
 * suitable for some use-cases then others. Simple applications
 * may prefer single state object while complex ones can be
 * designed in a more decentralized way with several state objects
 * (matching some specific domains) with possible model communication
 * via side-effects handler (.e.g. a model for a "messaging" subsystem
 * may trigger app's "file manager" model to store a message attachment as
 * a side effect).
 */
export abstract class StatelessModel<T extends object> implements IStatelessModel<T>, IModel<T> {

    private readonly state$:BehaviorSubject<T>;

    private wakeFn:((action:Action)=>boolean)|null;

    /**
     * A debugging callback for watching action arrival and match process.
     */
    private _onActionMatch:(state:T, action:Action, isMatch:boolean)=>void;

    protected readonly actionMatch:{[actionName:string]:IReducer<T, Action>};

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
    addActionHandler<A extends Action>(actionName:string, reducer:INewStateReducer<T, A>, seProducer?:ISideEffectHandler<T, A>):void {
        // Here we cheat a bit with types to avoid Immutable<T> type from Immer.
        // Maybe in later versions of Kombo we can force the state type to be Immutable application-wide.
        if (this.actionMatch[actionName] === undefined) {
            this.actionMatch[actionName] = produce(reducer) as IReducer<T, A>;

        } else {
            throw new Error(`Reducer for [${actionName}] already defined.`);
        }
        if (seProducer !== undefined) {
            if (this.sideEffectMatch[actionName] === undefined) {
                this.sideEffectMatch[actionName] = seProducer;

            } else {
                throw new Error(`Side-effect producer for [${actionName}] already defined.`);
            }
        }
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

    suspend(wakeFn:(action:Action)=>boolean):void {
        this.wakeFn = wakeFn;
    }

    /**
     * The method is used by Kombo to wake up suspended
     * models.
     *
     * @param action
     */
    wakeUp(action:Action):void {
        if (typeof this.wakeFn === 'function') {
            const ans = this.wakeFn(action);
            if (typeof ans !== 'boolean') {
                console.warn('Please make sure you explicitly return either true or false from the wakeUp function.');
            }
            if (ans) {
                this.wakeFn = null;
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