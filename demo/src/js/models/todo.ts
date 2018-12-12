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

import * as Immutable from 'immutable';

import {StatelessModel, Action, ActionDispatcher, SEDispatcher} from 'kombo';
import {ActionNames, Actions} from './actions';
import { ServerAPI } from './mockapi';


export interface TodoItem {
    id:number;
    complete:boolean;
    text:string;
}


export interface TodoState {
    items:Immutable.List<TodoItem>;
    isBusy:boolean;
}


export class TodoModel extends StatelessModel<TodoState> {

    private serverApi:ServerAPI;

    constructor(dispatcher:ActionDispatcher, serverApi:ServerAPI) {
        super(
            dispatcher,
            {
                items: Immutable.List<TodoItem>(),
                isBusy: false
            }
        );
        this.serverApi = serverApi;
    }


    reduce(state:TodoState, action:Action):TodoState {
        const newState = this.copyState(state);
        switch (action.name) {
            case ActionNames.AddTodo:
                newState.items = newState.items.push({
                    id: new Date().getTime(),
                    complete: false,
                    text: ''
                });
            break;
            case ActionNames.SetTextTodo: {
                const srch = newState.items.findIndex(x => x.id === action.payload['id']);
                if (srch > -1) {
                    const item = newState.items.get(srch);
                    newState.items = newState.items.set(srch, {
                        id: item.id,
                        complete: item.complete,
                        text: action.payload['value']
                    });
                }
            }
            break;
            case ActionNames.DeleteTodo: {
                const srch = newState.items.findIndex(x => x.id === action.payload['id']);
                if (srch > -1) {
                    newState.items = newState.items.remove(srch);
                }
            }
            break;
            case ActionNames.ToggleTodo: {
                const srch = newState.items.findIndex(x => x.id === action.payload['id']);
                if (srch > -1) {
                    const v = newState.items.get(srch);
                    newState.items = newState.items.set(srch, {
                        id: v.id,
                        text: v.text,
                        complete: !v.complete
                    });
                }
            }
            break;
            case ActionNames.FetchTodos:
                newState.isBusy = true;
            break;
            case ActionNames.FetchTodosDone:
                newState.isBusy = false;
                newState.items = newState.items.concat(action.payload['data'].map(v => {
                    return {
                        id: v.id,
                        text: v.text,
                        complete: false
                    }
                })).toList();
            break;
        }
        return newState;
    }

    sideEffects(state:TodoState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case ActionNames.FetchTodos:
                this.serverApi.fetchData().subscribe(v => {
                    dispatch({
                            name: ActionNames.FetchTodosDone,
                            payload: {data: v}
                    });
                });
            break;
        }
    }

}