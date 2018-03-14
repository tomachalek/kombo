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

import {StatelessModel, Action, ActionDispatcher} from 'kombo';
import {ActionTypes} from './actions';
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
            },
            (state, action, dispatch) => { // SIDE EFFECTS
                switch (action.type) {
                    case ActionTypes.FETCH_TODOS:
                        const resp = this.serverApi.fetchData();
                        resp.subscribe(v => {
                            dispatch({
                                type: ActionTypes.FETCH_TODOS_DONE,
                                payload: {data: v}
                            });
                        });
                    break;
                }
            }
        );
        this.serverApi = serverApi;
    }


    reduce(state:TodoState, action:Action):TodoState {
        const newState = this.copyState(state);
        switch (action.type) {
            case ActionTypes.ADD_TODO:
                newState.items = newState.items.push({
                    id: new Date().getTime(),
                    complete: false,
                    text: ''
                });
            break;
            case ActionTypes.SET_TEXT_TODO: {
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
            case ActionTypes.DELETE_TODO: {
                const srch = newState.items.findIndex(x => x.id === action.payload['id']);
                if (srch > -1) {
                    newState.items = newState.items.remove(srch);
                }
            }
            break;
            case ActionTypes.TOGGLE_TODO: {
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
            case ActionTypes.FETCH_TODOS:
                newState.isBusy = true;
            break;
            case ActionTypes.FETCH_TODOS_DONE:
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

}