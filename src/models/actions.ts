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

export enum ActionTypes {
    ADD_TODO = 'ADD_TODO',
    SET_TEXT_TODO = 'SET_TEXT_TODO',
    DELETE_TODO = 'DELETE_TODO',
    TOGGLE_TODO = 'TOGGLE_TODO',
    FETCH_TODOS = 'FETCH_TODOS',
    FETCH_TODOS_DONE = 'FETCH_TODOS_DONE'
}