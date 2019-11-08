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

import {StatelessModel, Action, ActionDispatcher, SEDispatcher} from 'kombo';
import {ActionNames, Actions} from './actions';
import { ServerAPI } from './mockapi';


export interface TodoItem {
    id:number;
    complete:boolean;
    text:string;
}


export interface TodoState {
    items:Array<TodoItem>;
    isBusy:boolean;
}


export class TodoModel extends StatelessModel<TodoState> {

    private serverApi:ServerAPI;

    constructor(dispatcher:ActionDispatcher, serverApi:ServerAPI) {
        super(
            dispatcher,
            {
                items: [],
                isBusy: false
            }
        );
        this.serverApi = serverApi;
        this.addActionHandler(
            ActionNames.AddTodo,
            (state, action:Actions.AddTodo) => {
                state.items = [...state.items, {
                    id: new Date().getTime(),
                    complete: false,
                    text: ''
                }]
            }
        );
        this.addActionHandler(
            ActionNames.SetTextTodo,
            (state, action:Actions.SetTextTodo) => {
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
        this.addActionHandler(
            ActionNames.DeleteTodo,
            (state, action:Actions.DeleteTodo) => {
                const srch = state.items.findIndex(x => x.id === action.payload['id']);
                if (srch > -1) {
                    state.items = state.items.slice(0, srch).concat(state.items.slice(srch + 1, state.items.length));
                }
            }
        );
        this.addActionHandler(
            ActionNames.ToggleTodo,
            (state, action:Actions.ToggleTodo) => {
                console.log('action: ', action);
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
        this.addActionHandler(
            ActionNames.FetchTodos,
            (state, action:Actions.ToggleTodo) => {
                state.isBusy = true;
            },
            (state, action, dispatch) => {
                this.serverApi.fetchData().subscribe(v => {
                    dispatch({
                            name: ActionNames.FetchTodosDone,
                            payload: {data: v}
                    });
                });
            }
        );
        this.addActionHandler(
            ActionNames.FetchTodosDone,
            (state, action:Actions.FetchTodosDone) => {
                state.isBusy = false;
                state.items = state.items.concat(action.payload['data'].map(v => {
                    return {
                        id: v.id,
                        text: v.text,
                        complete: false
                    }
                }));
            }
        );
    }

}