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
import { createRoot } from 'react-dom/client';

import { ActionDispatcher, ViewUtils} from 'kombo';
import { init as viewInit} from '../views/todomvc';
import { TodoModel } from '../models/todo';
import { AdjectivesModel } from '../models/adjectives';

import { TaskAPI, AdjectivesAPI } from '../api/mockapi';

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
        const taskApi = new TaskAPI();
        const todoModel = new TodoModel(
            dispatcher,
            taskApi,
            {
                error: null,
                items: [],
                isBusy: false,
                generateAdjectives: false
            }
        );
        const adjectiveApi = new AdjectivesAPI();
        const adjModel = new AdjectivesModel(
            dispatcher,
            adjectiveApi,
            {
                isHelpVisible: false,
                isActive: false,
                isBusy: false
            }
        );
        const viewUtils = new ViewUtils<{}>({
            uiLang: 'en_US',
            translations: this.translations
        });
        const component = viewInit(dispatcher, viewUtils, todoModel, adjModel);
        const root = createRoot(document.getElementById('root-mount'));
        root.render(React.createElement(component.TodoWidget, {version: '2020-04-03'}));
    }

}

export function init() {
    new IndexPage().init();
}