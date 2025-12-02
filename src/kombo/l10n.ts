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

import { FormatXMLElementFn, PrimitiveType } from "intl-messageformat";
import { ReactNode } from "react";


/**
 * RuntimeValueTranslator represents a function which
 * translates special dynamic (but low cardinality)
 * values typically obtained from database which may
 * need translations for end users.
 *
 * @param groupId can be used to specify a group
 * of values (imagine e.g. a code 'MERCH' in two different
 * contexts/datasets - where each needs its own translation)
 * @param value is the translated value
 */
export interface RuntimeValueTranslator {
    (groupId: string, value: string): string;
}


export interface ITranslator {

    translate(key:string, args?:{[key:string]:string|number|boolean}):string;

    translateRich(
        msg:string,
        values?:Record<string, PrimitiveType | ReactNode | FormatXMLElementFn<ReactNode>>
    ): string | ReactNode | Array<string | ReactNode>;

    /**
     * translate a dynamic/runtime value using a custom function.
     */
    translateRuntimeValue:RuntimeValueTranslator;

    formatDate(d:Date, timeFormat?:number):string;

    formatNumber(v:number, fractionDigits?:number):string;
}
