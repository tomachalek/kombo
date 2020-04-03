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

import { ActionNames, Actions } from './actions';
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
        this.addActionHandler<Actions.AddTodo>(
            ActionNames.AddTodo,
            (state, action) => {
                state.items = [...state.items, {
                    id: new Date().getTime(),
                    complete: false,
                    text: ''
                }]
            }
        );
        this.addActionHandler<Actions.SetTextTodo>(
            ActionNames.SetTextTodo,
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
        this.addActionHandler<Actions.DeleteTodo>(
            ActionNames.DeleteTodo,
            (state, action) => {
                const srch = state.items.findIndex(x => x.id === action.payload['id']);
                if (srch > -1) {
                    state.items = state.items.slice(0, srch).concat(state.items.slice(srch + 1, state.items.length));
                }
            }
        );
        this.addActionHandler<Actions.ToggleTodo>(
            ActionNames.ToggleTodo,
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
        this.addActionHandler<Actions.ToggleTodo>(
            ActionNames.FetchTodos,
            (state, action) => {
                state.isBusy = true;
            },
            (state, action, dispatch) => {
                (state.generateAdjectives ?
                    this.suspendWithTimeout(2500, {}, (action, syncData) => {
                        if (action.name === ActionNames.FetchAdjectivesDone) {
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

                ).subscribe(
                    v => {
                        dispatch<Actions.FetchTodosDone>({
                            name: ActionNames.FetchTodosDone,
                            payload: {data: v}
                        });
                    },
                    err => {
                        dispatch<Actions.FetchTodosDone>({
                            name: ActionNames.FetchTodosDone,
                            error: err
                        });
                    }
                )
            }
        );
        this.addActionHandler<Actions.FetchTodosDone>(
            ActionNames.FetchTodosDone,
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
        this.addActionHandler<Actions.ToggleAddAdjectives>(
            ActionNames.ToggleAddAdjectives,
            (state, action) => {
                state.generateAdjectives = !state.generateAdjectives;
            }
        );
    }

}