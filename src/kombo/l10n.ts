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

export type TranslationTable = {[key:string]:string};

export class ViewUtils<T> {

    private uiLang:string;

    private translations:{[lang:string]:TranslationTable};

    private components?:T;

    constructor(uiLang='en-US', translations?:{[lang:string]:TranslationTable}) {
        this.uiLang = uiLang.replace('_', '-');
        this.translations = translations || {'en-US': {}};
    }

    changeUILang(lang:string):void {
        this.uiLang = lang;
    }

    /**
     * @param d a Date object
     * @param timeFormat 0 = no time, 1 = hours + minutes, 2 = hours + minutes + seconds
     *  (hours, minutes and seconds are always in 2-digit format)
     */
    formatDate(d:Date, timeFormat:number=0):string {
        const opts = {year: 'numeric', month: '2-digit', day: '2-digit'};

        if (timeFormat > 0) {
            opts['hour'] = '2-digit';
            opts['minute'] = '2-digit';
        }
        if (timeFormat === 2) {
            opts['second'] = '2-digit';
        }
        return new Intl.DateTimeFormat(this.uiLang, opts).format(d);
    }

    translate(key:string, args?:{[key:string]:string}):string {
        return this.translations[this.uiLang][key] || key;
    }

    attachComponents(components:T):void {
        this.components = components;
    }

    getComponents():T|undefined {
        return this.components;
    }

}