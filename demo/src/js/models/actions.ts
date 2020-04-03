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
import { ServerTask } from '../api/mockapi';

export enum ActionNames {
    AddTodo = 'ADD_TODO',
    SetTextTodo = 'SET_TEXT_TODO',
    DeleteTodo = 'DELETE_TODO',
    ToggleTodo = 'TOGGLE_TODO',
    FetchTodos = 'FETCH_TODOS',
    FetchTodosDone = 'FETCH_TODOS_DONE',
    ToggleAddAdjectives = 'TOGGLE_ADD_ADJECTIVES',
    FetchAdjectivesDone = 'FETCH_ADJECTIVES_DONE',
    ToggleAdjectivesHelp = 'TOGGLE_ADJECTIVES_HELP'
}

export namespace Actions {

    export interface AddTodo extends Action<{
        id:number;
        value:string;
    }> {
        name:ActionNames.AddTodo;
    }

    export interface SetTextTodo extends Action<{
        id:number;
        value:string;
    }> {
        name:ActionNames.SetTextTodo;
    }

    export interface DeleteTodo extends Action<{
        id:number;
    }> {
        name:ActionNames.DeleteTodo;
    }

    export interface ToggleTodo extends Action<{
        id:number;
    }> {
        name:ActionNames.ToggleTodo;
    }

    export interface FetchTodos extends Action<{

    }> {
        name:ActionNames.FetchTodos;
    }

    export interface FetchTodosDone extends Action<{
        data:ServerTask;
    }> {
        name:ActionNames.FetchTodosDone;
    }

    export interface ToggleAddAdjectives extends Action<{
    }> {
        name:ActionNames.ToggleAddAdjectives;
    }

    export interface FetchAdjectivesDone extends Action<{
        value:string;
    }> {
        name:ActionNames.FetchAdjectivesDone;
    }

    export interface ToggleAdjectivesHelp extends Action<{
    }> {
        name:ActionNames.ToggleAdjectivesHelp;
    }
}