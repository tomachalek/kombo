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

export type URLArgValue = boolean|number|string|null|undefined;

export class URLArgs {

    private data:{[key:string]:Array<URLArgValue>};

    constructor(data?:{[key:string]:string}|Array<[string, string]>) {
        this.data = {};
    }

    private importValue(value:URLArgValue):string {
        if (typeof value === 'boolean') {
            return value ? '1' : '0';

        } else if (typeof value === 'number') {
            return value.toString();

        } else if (value === undefined || value === null) {
            return '';

        } else {
            throw new Error('Invalid object type');
        }
    }

    add(key:string, value:URLArgValue):URLArgs {
        if (!this.data.hasOwnProperty(key)) {
            this.data[key] = [];
        }
        this.data[key].push(value);
        return this;
    }

    set(key:string, value:URLArgValue):URLArgs {
        this.data[key] = [value];
        return this;
    }

    remove(key:string):URLArgs {
        this.data[key] = [];
        return this;
    }

    items():Array<[string, string]> {
        const ans:Array<[string, string]> = [];
        for (let p in this.data) {
            if (this.data.hasOwnProperty(p)) {
                this.data[p].forEach(v => ans.push([p, this.importValue(v)]));
            }
        }
        return ans;
    }

    asURLString():string {
        const exportValue = (v) => {
            return v === null || v === undefined ? '' : encodeURIComponent(v);
        }
        return this.items().map((item) => {
            return encodeURIComponent(item[0]) + '=' + exportValue(item[1]);
        }).join('&');
    }
}


export class Page {

}