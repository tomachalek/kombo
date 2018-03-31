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
import {Bound, ViewUtils, ActionDispatcher} from 'kombo';
import { ActionTypes } from '../models/actions';


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<{}>, model:TodoModel) {


    // ------------------- <TodoText /> --------------------------------

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
                    placeholder={ut.translate('input_add_task_placeholder')} disabled={props.complete} />;
    };

    // ------------------- <TodoCheckbox /> --------------------------------

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

    // ------------------- <ActIcon /> --------------------------------

    class ActIcon extends React.Component<{
        id:number;
        complete:boolean;
    },
    {
        isActive:boolean;
    }> {

        constructor(props) {
            super(props);
            this.state = {isActive: false};
            this.handleMouseover = this.handleMouseover.bind(this);
            this.handleMouseout = this.handleMouseout.bind(this);
            this.handleClick = this.handleClick.bind(this);
        }

        handleClick() {
            if (this.state.isActive) {
                dispatcher.dispatch({
                    type: ActionTypes.DELETE_TODO,
                    payload: {id: this.props.id}
                });
            }
        }

        handleMouseover() {
            this.setState({isActive: true});
        }

        handleMouseout() {
            this.setState({isActive: false});
        }

        private getIcon():string {
            if (this.props.complete) {
                return '\u263A';
            }
            return '\u00a0';
        }

        render() {
            return <a className={`act-icon${this.props.complete ? ' done' : ''}`}
                        onClick={this.handleClick} onMouseOver={this.handleMouseover}
                        onMouseOut={this.handleMouseout}>{this.state.isActive ? '\u274C' : this.getIcon()}</a>;
        }
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
            dispatcher.dispatch({
                type: ActionTypes.ADD_TODO
            });
        }

        return <button type="button" onClick={handleClick}>{ut.translate('btn_add_todo')}</button>;
    }

    // ------------------- <GenerateTasks /> --------------------------------

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
            return <button type="button" onClick={handleClick}>{ut.translate('btn_generate')}</button>;
        }
    }

    // ------------------- <TodoTable /> --------------------------------

    class TodoTable extends React.PureComponent<TodoState> {

        constructor(props) {
            super(props);
        }

        render() {
            return (
                <div className="TodoTable">
                    <dl>
                        {this.props.items.map((item, i) => <TodoRow key={`id:${item.id}`} idx={i} {...item} />)}
                    </dl>
                    <p className="controls">
                        <span><AddTodoButton /></span>
                        <span><GenerateTasks isBusy={this.props.isBusy} /></span>
                    </p>
                </div>
            );
        }
    }

    return {
        TodoTable: Bound<TodoState>(TodoTable, model)
    };

}