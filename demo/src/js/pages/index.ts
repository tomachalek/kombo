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
import * as ReactDOM from 'react-dom';

import {ActionDispatcher, ViewUtils} from 'kombo';
import {init as viewInit} from '../views/todomvc';
import {TodoModel} from '../models/todo';
import { ServerAPI } from '../models/mockapi';

declare var require:any;
require('../../css/style.css');

class IndexPage {

    private translations = {
        'en-US': {
            'btn_generate': 'Generate',
            'btn_add_todo': 'Add TODO',
            'input_add_task_placeholder': 'my new task'
        },
        'eo-EO': {
            'btn_generate': 'Generi',
            'btn_add_todo': 'Aldoni tasko',
            'input_add_task_placeholder': 'mia nova tasko'
        }
    };

    init():void {
        const dispatcher = new ActionDispatcher();
        const api = new ServerAPI();
        const model = new TodoModel(dispatcher, api);
        const viewUtils = new ViewUtils<{}>({
            uiLang: 'en_US',
            translations: this.translations
        });
        const component = viewInit(dispatcher, viewUtils, model);
        ReactDOM.render(
            React.createElement(component.TodoTable, {version: '2019-08-02'}),
            document.getElementById('root-mount')
        );
    }

}

export function init() {
    new IndexPage().init();
}