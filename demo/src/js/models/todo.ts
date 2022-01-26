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

import { StatelessModel, ActionDispatcher } from 'kombo';
import { of as rxOf } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';

import { Actions } from './actions';
import { TaskAPI, ServerTask } from '../api/mockapi';


export interface TodoItem {
    id:number;
    complete:boolean;
    text:string;
}


export interface TodoState {
    error:string|null;
    generateAdjectives:boolean;
    items:Array<TodoItem>;
    isBusy:boolean;
}


export class TodoModel extends StatelessModel<TodoState> {

    private serverApi:TaskAPI;

    constructor(dispatcher:ActionDispatcher, serverApi:TaskAPI, initState:TodoState) {
        super(dispatcher, initState);
        this.serverApi = serverApi;
        this.addActionHandler<typeof Actions.AddTodo>(
            Actions.AddTodo.name,
            (state, action) => {
                state.items = [...state.items, {
                    id: new Date().getTime(),
                    complete: false,
                    text: ''
                }]
            }
        );
        this.addActionHandler<typeof Actions.SetTextTodo>(
            Actions.SetTextTodo.name,
            (state, action) => {
                const srch = state.items.findIndex(x => x.id === action.payload['id']);
                if (srch > -1) {
                    const item = state.items[srch];
                    const tmp = [...state.items];
                    tmp[srch] = {
                        id: item.id,
                        complete: item.complete,
                        text: action.payload['value']
                    };
                    state.items = tmp;
                }
            }
        );
        this.addActionHandler<typeof Actions.DeleteTodo>(
            Actions.DeleteTodo.name,
            (state, action) => {
                const srch = state.items.findIndex(x => x.id === action.payload['id']);
                if (srch > -1) {
                    state.items = state.items.slice(0, srch).concat(state.items.slice(srch + 1, state.items.length));
                }
            }
        );
        this.addActionHandler<typeof Actions.ToggleTodo>(
            Actions.ToggleTodo.name,
            (state, action) => {
                const srch = state.items.findIndex(x => x.id === action.payload['id']);
                if (srch > -1) {
                    const v = state.items[srch];
                    const tmp = [...state.items];
                    tmp[srch] = {
                        id: v.id,
                        text: v.text,
                        complete: !v.complete
                    };
                    state.items = tmp;
                }
            }
        );
        this.addActionHandler<typeof Actions.FetchTodos>(
            Actions.FetchTodos.name,
            (state, action) => {
                state.isBusy = true;
            },
            (state, action, dispatch) => {
                (state.generateAdjectives ?
                    this.suspendWithTimeout(2500, {}, (action, syncData) => {
                        if (action.name === Actions.FetchAdjectivesDone.name) {
                            return null;
                        }
                        return syncData;

                    }).pipe(
                        concatMap(
                            a => this.serverApi.fetchData().pipe(
                                concatMap(resp => rxOf<[string, ServerTask]>([
                                    a.payload['value'], resp]))
                            )
                        ),
                        map(
                            ([adj, resp]) => ({
                                id: resp.id,
                                text: `${adj} ${resp.text}`
                            })
                        )
                    ) :
                    this.serverApi.fetchData()

                ).subscribe({
                    next: v => {
                        dispatch(Actions.FetchTodosDone, {data: v})
                    },
                    error: error => {
                        dispatch<typeof Actions.FetchTodosDone>({
                            name: Actions.FetchTodosDone.name,
                            error
                        });
                    }
                });
            }
        );
        this.addActionHandler<typeof Actions.FetchTodosDone>(
            Actions.FetchTodosDone.name,
            (state, action) => {
                state.isBusy = false;
                if (action.error) {
                    state.error = `ERROR: ${action.error}`;

                } else {
                    state.items.push({
                        id: action.payload.data.id,
                        text: action.payload.data.text,
                        complete: false
                    });
                }
            }
        );
        this.addActionHandler<typeof Actions.ToggleAddAdjectives>(
            Actions.ToggleAddAdjectives.name,
            (state, action) => {
                state.generateAdjectives = !state.generateAdjectives;
            }
        );

        this.DEBUG_logActions();
    }

}