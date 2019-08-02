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
import {BoundWithProps, ViewUtils, ActionDispatcher} from 'kombo';
import { ActionNames, Actions } from '../models/actions';


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<{}>, model:TodoModel) {


    // ------------------- <TodoText /> --------------------------------

    const TodoText:React.SFC<{
        text:string;
        id:number;
        complete:boolean;

    }> = (props) => {

        const handleInputChange = (evt:React.ChangeEvent<{value:string}>) => {
            dispatcher.dispatch<Actions.SetTextTodo>({
                name: ActionNames.SetTextTodo,
                payload: {
                    id: props.id,
                    value: evt.target.value
                }
            });
        }

        return <input type="text" value={props.text} onChange={handleInputChange}
                    placeholder={ut.translate('input_add_task_placeholder')} disabled={props.complete} />;
    };

    // ------------------- <TodoCheckbox /> --------------------------------

    const TodoCheckbox:React.SFC<{
        id:number;
        checked:boolean;

    }> = (props) => {

        const handleCheckbox = (evt:React.ChangeEvent<{}>) => {
            dispatcher.dispatch<Actions.ToggleTodo>({
                name: ActionNames.ToggleTodo,
                payload: {
                    id: props.id
                }
            });
        };

        return <input type="checkbox" checked={props.checked} onChange={handleCheckbox} />;
    };

    // ------------------- <ActIcon /> --------------------------------

    const ActIcon:React.SFC<{
        id:number;
        complete:boolean;
    }> = (props) => {

        const [isActive, setActive] = React.useState(false);

        const handleClick = () => {
            if (isActive) {
                dispatcher.dispatch<Actions.DeleteTodo>({
                    name: ActionNames.DeleteTodo,
                    payload: {id: props.id}
                });
            }
        };

        const handleMouseover = () => {
            setActive(true);
        };

        const handleMouseout = () => {
            setActive(false);
        }

        const getIcon = () => props.complete ? '\u263A' : '\u00a0';

        return <a className={`act-icon${props.complete ? ' done' : ''}`}
                    onClick={handleClick} onMouseOver={handleMouseover}
                    onMouseOut={handleMouseout}>{isActive ? '\u274C' : getIcon()}</a>;
    };

    // ------------------- <TodoRow /> --------------------------------

    const TodoRow:React.SFC<{
        idx:number;
        id:number;
        text:string;
        complete:boolean;

    }> = (props) => {
        return <>
            <dt>
                <em>{props.idx + 1}. {ut.formatDate(new Date(props.id), 1)}</em>
            </dt>
            <dd>
                <TodoCheckbox id={props.id} checked={props.complete} />
                <TodoText {...props} />
                <ActIcon id={props.id} complete={props.complete} />
            </dd>
        </>;
    }

    // ------------------- <AddTodoButton /> --------------------------------

    const AddTodoButton = (props) => {

        const handleClick = () => {
            dispatcher.dispatch<Actions.AddTodo>({
                name: ActionNames.AddTodo
            });
        }

        return <button type="button" onClick={handleClick}>{ut.translate('btn_add_todo')}</button>;
    }

    // ------------------- <GenerateTasks /> --------------------------------

    const GenerateTasks:React.SFC<{
        isBusy:boolean;

    }> = (props) => {

        const handleClick = () => {
            dispatcher.dispatch<Actions.FetchTodos>({
                name: ActionNames.FetchTodos
            });
        };

        if (props.isBusy) {
            return <img src="./img/ajax-loader.gif" />;

        } else {
            return <button type="button" onClick={handleClick}>{ut.translate('btn_generate')}</button>;
        }
    }

    // ------------------- <TodoTable /> --------------------------------

    const TodoTable:React.SFC<{version:string} & TodoState> = (props) => {

        return (
            <div className="TodoTable">
                <dl>
                    {props.items.map((item, i) => <TodoRow key={`id:${item.id}`} idx={i} {...item} />)}
                </dl>
                <p className="controls">
                    <span><AddTodoButton /></span>
                    <span><GenerateTasks isBusy={props.isBusy} /></span>
                </p>
                (version: {props.version})
            </div>
        );
    };

    return {
        TodoTable: BoundWithProps<{version:string}, TodoState>(TodoTable, model)
    };

}