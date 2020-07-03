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

import { Subscription } from 'rxjs';
import { Action, IStateChangeListener, SEDispatcher, IReducer } from '../action/common';


/**
 * Stateless modes as viewed from the framework perspective
 */
export interface IStatelessModel<T> {
    reduce:IReducer<T, Action>;
    sideEffects(state:T, action:Action, dispatch:SEDispatcher):void;
    isActive():boolean;
    wakeUp(action:Action):void;
}


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
}

