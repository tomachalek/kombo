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

import * as Rx from '@reactivex/rxjs';

export interface ServerTask {
    id:number;
    text:string;
}

export class ServerAPI {

    private verbs = ['wash', 'sell', 'buy', 'fix'];

    private objects = ['dishes', 'TV', 'windows', 'stereo', 'books']

    private randomVerb():string {
        return this.verbs[Math.round(Math.random() * (this.verbs.length - 1))];
    }

    private randomObject():string {
        return this.objects[Math.round(Math.random() * (this.objects.length - 1))];
    }

    private randomTask():string {
        return `${this.randomVerb()} ${this.randomObject()}`;
    }

    fetchData():Rx.Observable<Array<ServerTask>> {
        return Rx.Observable.create(observer => {
            window.setTimeout(
                () => {
                    const ans:Array<ServerTask> = [];
                    let id = new Date().getTime();
                    for (let i = 0; i < 1; i += 1) {
                        ans.push({
                            id: id + i,
                            text: this.randomTask()
                        });
                    }
                    observer.next(ans);
                },
                1500
            );
        });
    }
}