# Kombo

Kombo is a simple framework for building rich interactive web applications. It defines a small set
of classes and types providing state management for [React](https://reactjs.org/)
applications. Internals are based on [RxJS](http://reactivex.io/) and [Immer.js](https://immerjs.github.io/immer/docs/introduction).
Kombo takes some loose inspiration from Flux architecture and Redux library.
It is used in production (~thousands user per day) in applications containing tens thousands of lines of TypeScript
code with complex interactivity and open/modular architecture. It can be run on both client and server (Node.JS).

See Kombo in action:

1) `git clone https://github.com/tomachalek/kombo.git`
2) `make demo`
3) visit `/your/kombo/location/demo/index.html` to see a TodoMVC example


## Contents

* [Key principles](#key_principles)
* [Structure](#structure)
  * [Stateless models](#stateless_models)
  * [Stateful models](#stateful_models)
  * [Action capturing](#action_capturing)
  * [Model pausing](#model_pausing)
  * [Views](#view_module)
  * [Page initialization](#page_initialization)

<a name="key_principles"></a>
## Key principles

### General

* side-effect as first-class citizens
* multiple models
  * no global singletons (like e.g. stores in many Flux apps), keep awareness of components' dependencies
  * support for model composition and synchronization
* no boilerplate code (or as few as possible)
   * e.g. no action creators (dispatching directly from React components; do you really need to reuse
     a highly specific state-mapped React component?)
* no need to hate OOP - it can be combined with FP in a pragmatic way

### Models

* embrace more traditional "model" as an object which encapsulates a specified subdomain of business logic
  (including API calls etc.)
  * model should know what to do with its related state (no actionCreator/store dilemma)
  * **stateless model** transforms state with possible explicitly defined side effects
    * side effects may produce actions (i.e. model does this) but that's where the chain ends
      (i.e. no action loops),
  * **stateful model** is inherently impure and can change itself in any way and decide on its own when to notify change listeners
    (similar to classic event emitter from Flux)
* flexible model/state configuration
  * one model -- one state
  * many models -- one state
  * many models -- many states (typically each model handles its state here),
* synchronization of models using `suspend()` action where model can suspend itself until a specific
  action is triggered and data obtained via a respective action payload

### Views

* view components are always wrapped inside a function allowing explicit runtime dependency injection:
  * models
  * additional services like message translation
* React component is bound to a model using simple `Bound`, `BoundWithProps` functions

<a name="structure"></a>
## Structure

<a name="stateless_models"></a>
### Stateless models

Stateless model does not control when its related state is changed. It only specifies how the state is changed
in response to different actions. This is quite similar to the approach used e.g. by Redux. It also prevents
programmer from touching the state of a foreign model and passing it around.

It is expected that the state reduction does not mutate the original state. To achieve this,
different solutions can be used. In Kombo, it is preferred to use primitive data types along with
Array and Object for model state as it is more convenient to handle such values (between libraries
interoperability, support for recent JS constructs like array and object destructuring). To keep
update operations immutable on the native types, Kombo uses the great [Immer.js](https://github.com/immerjs/immer)
library.

When using `addActionHandler`, Kombo wraps a respective reducer function in Immer.js `produce` function which
means the state (so called `draft` in Immer.js) updates can be written in a "mutable" way while Immer.js
ensures the resulting state does not interfere with the previous one (Immer.JS internals use JS proxies
for this along with an approach called *persistent data structures*).

But it is also possible to override `StatelessModel.reduce` function in a completely different matter
if needed.

Another great thing about Kombo is that side-effects are first class citizens there. Even if the "redux-like"
pattern looks pure and cool, it actually does not handle side-effects without additional plug-ins. But
the truth is, a typical application is all about side-effects.

To be able to perform asynchornous API calls, synchronize/notify other models etc., Kombo `StatelessModel`
can specify its side effects bound to different actions. Such a side-effect is always invoked *after*
the model reduced a respective state based on the action. Side-effect actions are dispatched at will
via a provided function (see `SEDispatcher` type). In this way it is possible to build chains of asynchronous
actions with multiple actions dispatched during different stages of the process.

Actions dispatched via `SEDispatcher` are internally transformed into `SideEffectAction` type which cannot
invoke another action via the internal action/state stream. This prevents user from creating hard to track
cycles of actions.

```ts

export interface MyState {
    userId:number;
    firstname:string;
    lastname:string;
    memberships:Array<{id:string; type:string}>;
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
                memberships:Array<{id:string; type:string}>(),
                isBusy: false
            }
        );
        this.addActionHandler(
            'REGISTER_USER',
            (state, action) => { // reducer, 'state' is already a copy
                state.isBusy = true;
            },
            (state, action, dispatch) => { // side-effect of the action (optional)
                dispatch({
                    type: 'REGISTER_USER_DONE',
                    payload: {userId: someFetchedInfo['userId']};
                });
            }
        );
        this.addActionHandler<MyTypedAction>(
            'REGISTER_USER_DONE',
            (state, action) => {
                newState.isBusy = false;
                newState.userId = action.payload.userId;
                return newState;
            }
        );
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

Kombo is designed in a way that stateful models should be needed only in very specific situations. So it
is definitely recommended not to overuse them.

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
                    ajax$(...).subscribe(
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
            }
        });
    }
}
```

<a name="action_capturing"></a>
### Action capturing

While having multiple mostly independent models is quite convenient, there are
situations when all the limitations make solving the problem almost impossible.
Let's summarize those limitations:

* an action dispatched from a side effect cannot produce another side effect,
* application does not control order in which its models are triggered by an action.

But what if we need e.g. the following scenario: We have a model controlling some
query form. Then we have several modules with models - each ready to read
data from the query form model. Once user hits *Submit*, we need to validate data
first and then, if everything is OK, we need to trigger all the dependent models.

We can use the following Kombo properties:

* it is possible to dispatch a stream which means we can easily synchronously
  dispatch two actions,
* Kombo ActionDispatcher allows capturing an action.

Captured actions first trigger registered function and if the function returns
true then the action hits all the models. So it is possible to check any model
for its state (generated by a previous action) and then return either true or false.

```ts
dispatcher.captureAction(
    'SERVICE_MODELS_QUERY_SUBMIT',
    (action) => model1.getState().isValid && model2.getState().isValid
);
```

Any action can have only one *capturing function* and it is not allowed to
unregister it.


<a name="model_pausing"></a>
 ### Model suspending

 Model suspending is a basic synchronization tool for Kombo models (`StatelessModel`, `StatefulModel`).

Let's say a model (A) has to wait for some other model (B) to perform an action
(e.g. to load data via AJAX, 'QUERY_VALIDATION_DONE' in the example below) while both models
react to the same initial action ('PERFORM_QUERY'). it is possible
 to make the model A wait for the action of B:

 ```ts
 // side effects of model A
 this.addActionHandler(
    'PERFORM_QUERY',
    (state, action) => {
        state.isBusy = true;
    },
    (state, action, dispatch) => {
        this.suspend({}, (action:Action, syncData) => { // from now, the function is called on each action
            if (action.name === 'QUERY_VALIDATION_DONE') { /* we wait for model B here */
                return null; // by returning no synchronization data we say: "stop waiting"
            }
            // by returning original syncData we say: "not interested in this action"
            // (= do not send the action down the stream)
            return syncData; 

        }).pipe(
            concatMap((matchingAction) => doSomeAsyncStuff(matchingAction.payload))

        ).subscribe(
            (data) => {
                dispatch({
                    name: 'MY_POSTPONED_ACTION',
                    payload: {data: data}
                });
            }
        );
    }
 );
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

It is also possible to combine props from the bound model with some by-parent injected ones using
`BoundWithProps`.


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
