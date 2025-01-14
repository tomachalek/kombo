/*
 * Copyright 2020 Tomas Machalek <tomas.machalek@gmail.com>
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

import { StatelessModel } from 'kombo';
import { Actions } from './actions';
import { AdjectivesAPI } from '../api/mockapi';


export interface AdjectivesModelState {
    isHelpVisible:boolean;
    isActive:boolean;
    isBusy:boolean;
}


export class AdjectivesModel extends StatelessModel<AdjectivesModelState> {

    private readonly api:AdjectivesAPI;

    constructor(dispatcher, api:AdjectivesAPI, initState:AdjectivesModelState) {
        super(dispatcher, initState);
        this.api = api;

        this.addActionHandler(
            Actions.ToggleAddAdjectives,
            (state, action) => {
                state.isActive = !state.isActive;
            }
        );

        this.addActionHandler(
            Actions.FetchAdjectivesDone,
            (state, action) => {
                state.isBusy = false;
            }
        );

        this.addActionHandler(
            Actions.FetchTodos,
            (state, action) => {
                if (state.isActive) {
                    state.isBusy = true;
                }
            },
            (state, action, dispatch) => {
                if (state.isActive) {
                    this.api.fetchData().subscribe(
                        data => {
                            dispatch({
                                name: Actions.FetchAdjectivesDone.name,
                                payload: {
                                    value: data
                                }
                            })
                        }
                    );
                }
            }
        );

        this.addActionHandler(
            Actions.ToggleAdjectivesHelp,
            (state, action) => {
                state.isHelpVisible = !state.isHelpVisible;
            }
        );
    }

}