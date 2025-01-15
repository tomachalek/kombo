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

import { Subscription, Observable } from 'rxjs';
import { Action, IStateChangeListener, SEDispatcher, IReducer } from '../action/common.js';


export interface ISuspendable {
    waitForActionWithTimeout<U>(timeout:number, syncData:U, wakeFn:(action:Action, syncData:U)=>U|null):Observable<Action>;
    waitForAction<U>(syncData:U, wakeFn:(action:Action, syncData:U)=>U|null):Observable<Action>;
    wakeUp(action:Action):void;
    isActive():boolean;
}

/**
 * Stateless modes as viewed from the framework perspective
 */
export interface IStatelessModel<T> extends ISuspendable {
    reduce:IReducer<T, Action>;
    sideEffects(state:T, action:Action, dispatch:SEDispatcher):void;
    isActive():boolean;
}

export interface IActionCapturer {
    (action:Action):boolean;
}

export interface IActionHandlerModifier {

    reduceAlsoOn(...actions:Array<string>):IActionHandlerModifier;
    sideEffectAlsoOn(...actions:Array<string>):IActionHandlerModifier;

}

export interface ModelActionLoggingArgs {

    handledOnly?:boolean;

    /**
     * If undefined, then all the properties of a payload are displayed.
     * Otherwise only the ones with the 'true' value.
     */
    payloadFilter?:{[prop:string]:boolean};

    /**
     * If true then the payload is logged on a separate line and passed through JSON serialization
     * to keep it accessible (expandable).
     */
    expandablePayload?:boolean;
}

/**
 * _payloadFilter produces a modified action with filtered payload according to the 'filt'
 * argument. This is intended only for DEBUG_* functions.
 */
export function _payloadFilter(a:Action, filt:undefined|{[k:string]:boolean}):Action {
    if (!filt) {
        return {...a};
    }
    const p2 = {};
    const srcPayload = a.payload || {};
    for (let k in srcPayload) {
        if (filt[k]) {
            p2[k] = srcPayload[k];
        }
    }
    return {...a, payload: p2};
}

/**
 * A general model implementation as viewed from
 * the perspective of a React component.
 */
export interface IModel<T> {

    addListener(fn:IStateChangeListener<T>):Subscription;

    /**
     * Get actual state (typically to instantiate a bound React component).
     * This should not be misused e.g. to communicate state
     * between models (models should communicate only via actions)
     */
    getState():T;

    /**
     * In case it is needed to create and dispose models
     * during an applicaton lifecycle, stateless models must be
     * unregistered before we can forget about them.
     * Otherwise, a reference will still exist from within
     * Kombo action stream.
     * But in most cases, models should remain instantiated
     * during the whole application lifecycle.
     */
    unregister():void;


    /**
     * Log all (or all matching only if handledOnly is set to true) actions
     * to console. This is for debugging purposes.
     */
    DEBUG_logActions(args?:ModelActionLoggingArgs):void;

}

export type MultipleActions<T extends readonly unknown[]> = {
    [K in keyof T]: T[K] extends Action|string ? T[K] : never
}

export type UnionFromTuple<T> = T extends Array<any> ? T[number] : never;
