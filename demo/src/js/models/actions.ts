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

import { Action } from 'kombo';
import { ServerTask } from '../api/mockapi';


export class Actions {

    static AddTodo:Action<{
        id:number;
        value:string;
    }> = {
        name: 'ADD_TODO'
    }

    static SetTextTodo:Action<{
        id:number;
        value:string;
    }> = {
        name: 'SET_TEXT_TODO'
    }

    static DeleteTodo:Action<{
        id:number;
    }> = {
        name: 'DELETE_TODO'
    }

    static ToggleTodo:Action<{
        id:number;
    }> = {
        name: 'TOGGLE_TODO'
    }

    static FetchTodos:Action<{

    }> = {
        name: 'FETCH_TODOS'
    }

    static FetchTodosDone:Action<{
        data:ServerTask;
    }> = {
        name: 'FETCH_TODOS_DONE'
    }

    static ToggleAddAdjectives:Action<{
    }> = {
        name: 'TOGGLE_ADD_ADJECTIVES'
    }

    static FetchAdjectivesDone:Action<{
        value:string;
    }> = {
        name: 'FETCH_ADJECTIVES_DONE'
    }

    static ToggleAdjectivesHelp:Action<{
    }> = {
        name: 'TOGGLE_ADJECTIVES_HELP'
    }
}