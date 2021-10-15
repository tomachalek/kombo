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


/**
 * This is typically provided by a React component to react
 * to state changes.
 */
export interface IStateChangeListener<T> {
    (state?:T):void;
}

/**
 * Flux-like (aka "stateful" here) model.
 */
export interface IEventEmitter<T={}> {
    addListener(callback:(state?:T)=>void):Subscription;
    emitChange():void;
}

/**
 * General state reducer.
 */
export interface IReducer<T, U extends Action> {
    (state:T, action:U):T;
}

/**
 * This reducer provides you with the state copy so
 * there is no need to copy the state and return it.
 */
export interface INewStateReducer<T, U extends Action> {
    (newState:T, action:U):void;
}

export interface ISideEffectHandler<T, U extends Action> {
    (state:T, action:U, seDispatch:SEDispatcher):void;
}

/**
 * A function to dispatch side effect of an action
 */
export interface SEDispatcher {
    <T extends Action>(seAction:T):void;
    <T extends Action<U>, U>(seAction:T, error:Error):void;
    <T extends Action<U>, U>(seAction:T, payload:U):void;
    <T extends Action<U>, U>(seAction:T, payload:U, error:Error):void;
}

/**
 * Type guard function for testing whether an action is side-effect
 */
export function isSideEffect(action:AnyAction<{}>):action is SideEffectAction<{}> {
    return !!action.isSideEffect;
};




