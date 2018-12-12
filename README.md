# Kombo

(a work in progress project)

Kombo is a simple base for client-side application based on [React](https://reactjs.org/) &amp;
[RxJS](http://reactivex.io/). It takes some loose inspiration from Flux architecture and Redux library.
It is used in production in an application containing ~60k lines of TypeScript code and with
thousands of users.

## Contents

* [Key principles](#key_principles)
* [Structure](#structure)
  * [Stateless models](#stateless_models)
  * [Stateful models](#stateful_models)
  * [Views](#view_module)
  * [Page initialization](#page_initialization)

<a name="key_principles"></a>
## Key principles

* no boilerplate code (or as few as possible)
* no global singleton models (like e.g. stores in many Flux apps)
  * this breaks any awareness of components' dependencies
* no pure FP/OOP/... ideology - just use what's good for the job
* embrace more traditional "model" as an object which encapsulates a specified subdomain of business logic
  (including API calls etc.)
  * model should know what to do with its related state (no actionCreator/store dilemma)
  * stateless model transforms state with possible explicitly defined side effects
    * side effects may produce actions (i.e. model does this) but that's where the chain ends
      (i.e. no action loops)
  * stateful model is inherently impure and can change itself in any way and decide on its own when to notify change listeners
    (similar to classic event emitter from Flux)
* no action creators (dispatching directly from React components)
* flexible model/state configuration
  * one model -- one state
  * many models -- one state
  * many models -- many states (typically each model handles its state here)
* view components are always wrapped inside a function allowing runtime dependency injection
  (e.g. translation of messages is based on runtime user language settings)

<a name="structure"></a>
## Structure

<a name="stateless_models"></a>
### Stateless models

Stateless model does not control when its related state is changed. It only specifies how the state is changed
in response to different actions (note: do not forget to pass through an original state in case the model does
not respond to an action).

It is expected that the state is a traditional JS object with (ideally) immutable values. This allows simple
(shallow) state copying when reducing without fear of strange app behavior. The best way to achieve this is
to use primitive values (string, number, boolean) combined with immutable structured data types (e.g. Immutable.js).

To be able to perform asynchornous API calls, synchronize/notify other models etc., stateless model
can specify its side effects bound to different actions. These effects are invoked once their respective actions
reduce the current state (i.e. you can be always sure that all the reduce actions on all models have been already performed - so it's quite safe to access other models' state). Side-effect actions are dispatched at will via a provided function (see `SEDispatcher` type). In this way it is possible to build chains of asynchronous actions with multiple actions dispatched during different stages of the process.

Actions dispatched via `SEDispatcher` are internally transformed into `SideEffectAction` type which cannot invoke another action via the internal action/state stream. This prevents user from creating hard to track cycles of actions.

```ts

export interface MyState {
    userId:number;
    firstname:string;
    lastname:string;
    memberships:Immutable.List<{id:string; type:string}>;
    isBusy:boolean;
}

export class MyModel extends StatelessModel<MyState> {

    constructor(dispatcher:ActionDispatcher) {
        super(
            dispatcher,
            {   // initial state
                userId: -1,
                firstname: '',
                lastname: '',
                memberships:Immutable.List<{id:string; type:string}>(),
                isBusy: false
            }
        );
    }

    reduce(state:MyState, action:Action):MyState {
        const newState = this.copyState(state);
        switch (action.type) {
            case 'REGISTER_USER':
                newState.isBusy = true;
            break;
            case 'REGISTER_USER_DONE':
                newState.isBusy = false;
                newState.userId = action.payload['userId'];
            break;
            default:
                return state;
        }
        return newState;
    }

    sideEffects(state:MyState, action:Action, dispatch:SEDispatcher) => {
        switch (action.type) {
            case 'REGISTER_USER':
                // do some (async) stuff
                // or trigger some other store.
                // dispatching of a side-effect is
                // done via a provided function (and
                // not the dispatcher in costructor)
                dispatch({
                    type: 'REGISTER_USER_DONE',
                    payload: {userId: someFetchedInfo['userId']};
                })

            break;
        }
    }

}
```

<a name="stateful_models"></a>
### Stateful models

Stateful models provide more low-level and fine-grained control on how an action is processed as they
have full access to their state and also to when they emit change or trigger side effect actions
(in terms of stateful models, the respective method is called "synchronize").

Stateful models can be great e.g. for legacy code integration or for situations when a respective state
does contain non-serializable stuff (functions, dynamically loaded components). Such solutions can be
considered ugly or "impure" but sometimes they are quite effective and easy to implement. Kombo does not
force any specific approach here - if you want a clean "Redux-like" architecture you can stick with Stateless
model. But if you consider a problem hard to implement that way, Stateful model is ready to help you. From
the React component's view, both Stateless and Stateful components are the same and can be bound to any model
via the *Bound* wrapper component.

```ts
export class MyStatefulModel extends StatefulModel {

    constructor(dispatcher:ActionDispatcher) {
        dispatcher.onAction(action => {
            switch (action.type) {
                case 'GET_DATA':
                    this.isBusy = true;
                    // We don't have to define two actions (GET_DATA, GET_DATA_DONE).
                    // just notify React components before and after we start to
                    // process the data reading.
                    this.emitChange();
                    this.ajax(...).then(
                        (data) => {
                            this.data = data;
                            this.isBusy = false;
                            this.emitChange();
                        },
                        (err) => {
                            this.data = null;
                            this.error = err;
                            this.isBusy = false;
                            this.emitChange();
                        }
                    )
                break;
                case 'ADD_USER':
                    // 1) do some internal stuff
                    // ....
                    // 2) trigger other model(s)
                    this.synchronize({type: 'ADD_MSG_IN_OTHER_MODEL'})
                break;
            }
        });
    }
}
```

<a name="view_module"></a>
### View module

```tsx
import * as React from 'react';
import {Bound, ActionDispatcher, ViewUtils} from 'kombo';

export function init(dispatcher:ActionDispatcher, ut:ViewUtils, model:TodoModel) {

    const TodoText:React.SFC<{
        text:string;
        id:number;
        complete:boolean;

    }> = (props) => {

        const handleInputChange = (evt:React.ChangeEvent<{value:string}>) => {
            dispatcher.dispatch({
                type: ActionTypes.SET_TEXT_TODO,
                payload: {
                    id: props.id,
                    value: evt.target.value
                }
            });
        }

        return <label>{ut.translate('msg_key1')}
                 <input type="text" value={props.text} onChange={handleInputChange}
                    placeholder="my new task" disabled={props.complete} />
        </label>;
    };

    class TodoTable:React.SFC<TodoTableProps> {
     // ....
    };

    return {
      TodoText: TodoText,
      TodoTable: Bound<TodoState>(TodoTable, model) // Bound wrapper passes state to props
    }
}
```

<a name="page_initialization"></a>
### Page initialization

```ts
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import {ActionDispatcher, ViewUtils} from 'kombo';
import {init as viewInit} from '../views/todomvc';
import {TodoModel} from '../models/todo';
import { ServerAPI } from '../models/mockapi';


export function init() {
    const dispatcher = new ActionDispatcher();
    const model = new MyModel(dispatcher);
    const viewUtils = new ViewUtils('en_US');
    const component = viewInit(dispatcher, viewUtils, model);
    ReactDOM.render(
        React.createElement(component.TodoTable),
        document.getElementById('root-mount')
    );
}
```
