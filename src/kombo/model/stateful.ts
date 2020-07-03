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
import { IModel } from './common';
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
export abstract class StatefulModel<T> implements IEventEmitter, IModel<T> {

    private change$:Subject<T>;

    private dispatcher:IFullActionControl;

    protected state:T;

    private actionMatch:{[actionName:string]:(action:Action)=>void};

    /**
     * A debugging callback for watching action arrival and match process.
     */
    private _onActionMatch:(action:Action, isMatch:boolean)=>void;

    constructor(dispatcher:IFullActionControl, initialState:T) {
        this.state = initialState;
        this.change$ = new BehaviorSubject<T>(this.state);
        this.dispatcher = dispatcher;
        this.dispatcher.registerStatefulModel(this);
        this.actionMatch = {};
    }

    /**
     * When relying on default action handling implementation,
     * it is harder to debug action matching process.
     * This function makes such debugging easier.
     */
    DEBUG_onActionMatch(fn:(action:Action, isMatch:boolean)=>void) {
        this._onActionMatch = fn;
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
        this.state = produce(this.state, prod);
        this.emitChange();
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
     * Stateful model implementation must handle
     * unregistration process manually. Typically
     * this operates on the value returned
     * by StatefulModel#addListener().
     */
    abstract unregister():void;
}