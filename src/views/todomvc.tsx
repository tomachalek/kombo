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

import * as React from 'react';

import {TodoState, TodoModel} from '../models/todo';
import {Connected} from '../core/components';
import { ActionDispatcher } from '../core/main';
import { ActionTypes } from '../models/actions';

export function init(dispatcher:ActionDispatcher, model:TodoModel) {

    const TodoText:React.SFC<{
        text:string;
        id:number;
        complete:boolean;

    }> = (props) => {

        const handleInputChange = (evt:React.ChangeEvent<{value:string}>) => {
            dispatcher.dispatch({
                type: ActionTypes.SET_TEXT_TODO,
                payload: {
                    id: props.id,
                    value: evt.target.value
                }
            });
        }

        return <input type="text" value={props.text} onChange={handleInputChange}
                    placeholder="my new task" disabled={props.complete} />;
    }

    const TodoCheckbox:React.SFC<{
        id:number;
        checked:boolean;

    }> = (props) => {

        const handleCheckbox = (evt:React.ChangeEvent<{}>) => {
            dispatcher.dispatch({
                type: ActionTypes.TOGGLE_TODO,
                payload: {
                    id: props.id
                }
            });
        };

        return <input type="checkbox" checked={props.checked} onChange={handleCheckbox} />;
    };

    const TodoRow:React.SFC<{
        idx:number;
        id:number;
        text:string;
        complete:boolean;

    }> = (props) => {
        return (
            <tr className="TodoRow">
                <th>
                    {props.idx + 1}.
                </th>
                <td>
                    <TodoText {...props} />
                </td>
                <td>
                    <TodoCheckbox id={props.id} checked={props.complete} />
                </td>
            </tr>
        );
    }

    const AddTodoButton = (props) => {

        const handleClick = () => {
            dispatcher.dispatch({
                type: ActionTypes.ADD_TODO
            });
        }

        return <button type="button" onClick={handleClick}>Add TODO</button>;
    }


    const GenerateTasks:React.SFC<{
        isBusy:boolean;

    }> = (props) => {

        const handleClick = () => {
            dispatcher.dispatch({
                type: ActionTypes.FETCH_TODOS
            });
        };

        if (props.isBusy) {
            return <img src="./img/ajax-loader.gif" />;

        } else {
            return <button type="button" onClick={handleClick}>Generate</button>;
        }
    }


    class TodoTable extends React.PureComponent<TodoState> {

        constructor(props) {
            super(props);
        }

        render() {
            return (
                <div className="TodoTable">
                    <table>
                        <tbody>
                            {this.props.items.map((item, i) => <TodoRow key={`id:${item.id}`} idx={i} {...item} />)}
                        </tbody>
                    </table>
                    <p>
                        <AddTodoButton />
                    </p>
                    <p>
                        <GenerateTasks isBusy={this.props.isBusy} />
                    </p>
                </div>
            );
        }
    }

    return {
        TodoTable: Connected<TodoState>(TodoTable, model)
    };

}