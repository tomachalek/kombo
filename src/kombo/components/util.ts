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

import { ITranslator } from '../l10n';
import IntlMessageFormat from '../../vendor/intl-messageformat';


export type TranslationTable = {[key:string]:string};


export type ComponentLib<T> = {[key in keyof T]:T[key]};


export interface ViewUtilsArgs {
    translations:{[lang:string]:TranslationTable};
    uiLang:string;
    staticUrlCreator?:(path:string)=>string;
    actionUrlCreator?:(path:string, args?:{[k:string]:string}|Array<[string, string]>)=>string;
}


export class ViewUtils<T extends ComponentLib<T>> implements ITranslator {

    public static readonly DEFAULT_LANG = 'en-US';

    private uiLang:string;

    private readonly translations:{[lang:string]:TranslationTable};

    private currTranslation:TranslationTable;

    private components?:ComponentLib<T>;

    readonly createStaticUrl:(path:string)=>string;

    readonly createActionUrl:(path:string, args?:{[k:string]:string}|Array<[string, string]>)=>string;

    constructor({uiLang, translations, staticUrlCreator, actionUrlCreator}:ViewUtilsArgs) {
        this.uiLang = uiLang.replace('_', '-');
        this.translations = translations || {[ViewUtils.DEFAULT_LANG]: {}};
        this.currTranslation = this.translations[this.ensureLangKey(this.uiLang)];
        this.createStaticUrl = staticUrlCreator ? staticUrlCreator : s => s;
        this.createActionUrl = actionUrlCreator ? actionUrlCreator : (s, a) => s; // TODO ?
    }

    private ensureLangKey(lang:string):string {
        if (lang in this.translations) {
            return lang;
        }
        const langBase = lang.split('-')[0];
        const langs = Object.keys(this.translations);
        for (let i = 0; i < langs.length; i += 1) {
            if (langs[i].split('-')[0] == langBase) {
                console.warn(`Found only a partially matching translation for ${lang}`);
                return langs[i];
            }
        }
        console.error(`Cannot find a translation for ${lang}. Falling back to ${ViewUtils.DEFAULT_LANG}`);
        return ViewUtils.DEFAULT_LANG;
    }

    changeUILang(lang:string):void {
        this.uiLang = lang;
        this.currTranslation = this.translations[this.ensureLangKey(this.uiLang)];
    }

    /**
     * @param d a Date object
     * @param timeFormat 0 = no tiConcreteComponentsme, 1 = hours + minutes, 2 = hours + minutes + seconds
     *  (hours, minutes and secondConcreteComponentss are always in 2-digit format)
     */
    formatDate(d:Date, timeFormat:number=0):string {
        const opts:{[k:string]:'numeric'|'2-digit'|undefined} = {year: 'numeric', month: '2-digit', day: '2-digit'};

        if (timeFormat > 0) {
            opts['hour'] = '2-digit';
            opts['minute'] = '2-digit';
        }
        if (timeFormat === 2) {
            opts['second'] = '2-digit';
        }
        return new Intl.DateTimeFormat(this.uiLang, opts).format(d);
    }

    formatNumber(v:number, fractionDigits:number=2):string {
        let format:any = new Intl.NumberFormat(this.uiLang, {
            maximumFractionDigits: fractionDigits
        });
        return format.format(v);
    }

    translate(key:string, args?:{[key:string]:string|number|boolean}):string {
        if (key) {
            const tmp = this.currTranslation[key];
            if (tmp) {
                try {
                    return args ? new IntlMessageFormat(tmp, this.uiLang).format(args) : tmp;

                } catch (e) {
                    console.error('Failed to translate ', key, e);
                    return tmp;
                }
            }
            return key;
        }
        return '';
    }

    attachComponents(components:T):void {
        this.components = components;
    }

    getComponents():ComponentLib<T>|undefined {
        return this.components;
    }

    getElementSize(elm:HTMLElement, dflt?:[number, number]):[number, number] {
        if (elm) {
            return [elm.getBoundingClientRect().width, elm.getBoundingClientRect().height];

        } else if (dflt) {
            return dflt;
        }
        return [-1, -1];
    }

    canUseDOM():boolean {
        return !!(typeof window !== 'undefined' && window.document && window.document.createElement);
    }

}
