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

import {Action} from 'kombo';
import { ServerTask } from './mockapi';

export enum ActionNames {
    AddTodo = 'ADD_TODO',
    SetTextTodo = 'SET_TEXT_TODO',
    DeleteTodo = 'DELETE_TODO',
    ToggleTodo = 'TOGGLE_TODO',
    FetchTodos = 'FETCH_TODOS',
    FetchTodosDone = 'FETCH_TODOS_DONE'
}

export namespace Actions {

    export interface AddTodo extends Action<ActionNames.AddTodo, {
        id:number;
        value:string;
    }> {}

    export interface SetTextTodo extends Action<ActionNames.SetTextTodo, {
        id:number;
        value:string;
    }> {}

    export interface DeleteTodo extends Action<ActionNames.DeleteTodo, {
        id:number;
    }> {}

    export interface ToggleTodo extends Action<ActionNames.ToggleTodo, {
        id:number;
    }> {}

    export interface FetchTodos extends Action<ActionNames.FetchTodos, {

    }> {}

    export interface FetchTodosDone extends Action<ActionNames.FetchTodosDone, {
        data:ServerTask[]
    }> {}
}