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

import { Observable } from 'rxjs';

export interface ServerTask {
    id:number;
    text:string;
}

export class TaskAPI {

    private verbs = ['wash', 'sell', 'buy', 'fix', 'upgrade', 'donate', 'build'];

    private objects = ['dishes', 'TV', 'windows', 'stereo', 'books', 'records', 'computer', 'boiler'];

    private randomVerb():string {
        return this.verbs[Math.round(Math.random() * (this.verbs.length - 1))];
    }

    private randomObject():string {
        return this.objects[Math.round(Math.random() * (this.objects.length - 1))];
    }

    private randomTask():string {
        return `${this.randomVerb()} ${this.randomObject()}`;
    }

    fetchData():Observable<ServerTask> {
        return new Observable(observer => {
            window.setTimeout(
                () => {
                    const ans:Array<ServerTask> = [];
                    let id = new Date().getTime();
                    observer.next({
                        id: id,
                        text: this.randomTask()
                    });
                    observer.complete();
                },
                1500
            );
        });
    }
}



export class AdjectivesAPI {

    private adjectives = [
        'gently', 'crudely', 'slowly', 'dangerously', 'artfully', 'poorly', 'perfectly',
        'professionally', 'mysteriously', 'awkwardly', 'superfluously', 'roughly'];

    private randomAdjective():string {
        return this.adjectives[Math.round(Math.random() * (this.adjectives.length - 1))];
    }

    fetchData():Observable<string> {
        return new Observable(observer => {
            window.setTimeout(
                () => {
                    observer.next(this.randomAdjective());
                    observer.complete();
                },
                1800
            );
        });
    }
}