# Kombo

Kombo is a simple framework for building rich interactive web applications. It defines a small set
of classes and types providing state management for [React](https://reactjs.org/)
components. Internals are based on [RxJS](http://reactivex.io/) and [Immer.js](https://immerjs.github.io/immer/docs/introduction).
Kombo takes some loose inspiration from Flux architecture and Redux library.
It is used in production (~thousands user per day) in applications containing tens thousands
of lines of TypeScript code with complex interactivity and open/modular architecture. It can
be run on both client and server (Node.JS).

See Kombo in action:

1) `git clone https://github.com/tomachalek/kombo.git`
2) `make demo`
3) visit `/your/kombo/location/demo/index.html` to see a TodoMVC example


## Contents

- [Kombo](#kombo)
  - [Contents](#contents)
  - [Key principles](#key-principles)
    - [General](#general)
    - [Models](#models)
    - [Views](#views)
  - [Structure](#structure)
    - [Stateless models](#stateless-models)
    - [Stateful models](#stateful-models)
    - [Model synchronization](#model-synchronization)
    - [View module](#view-module)
    - [Page initialization](#page-initialization)

<a name="key_principles"></a>
## Key principles

### General

* side-effect as first-class citizens
* multiple models
  * no global singletons (like e.g. stores in Flux apps) to keep awareness of components' dependencies
  * support for model composition and synchronization
* no boilerplate code (or as few as possible)
   * e.g. no action creators (dispatching directly from React components; do you really need to reuse
     a highly specific state-mapped React component?)
* no need to hate OOP - it can be combined with FP in a pragmatic way

### Models

* embrace more traditional "model" as an object which encapsulates a specified subdomain of business logic
  (including API calls etc.)
  * model should know what to do with its related state (no actionCreator/store dilemma)
  * **stateless model** transforms state provided by a reactive stream; it is quite similar to a
    Redux reducer function but with native support for producing side effects
  * **stateful model** has direct read access to its state; it can also mix multiple changes state
  changes and side effect during a single action handling (similar to classic event emitter from Flux)
* flexible model/state configuration
  * one model -- one state object
  * many models -- one state object
  * many models -- many state objects (typically each model handles its state here),
* synchronization of models using `waitForAction()` action where model can suspend itself until a specific
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
Kombo uses the great [Immer.js](https://github.com/immerjs/immer) library which allows handling
state like a mutable object. E.g.:

```ts
(state, action) => {
    state.data.push(action.payload.data);
}
```

It is also possible to override `StatelessModel.reduce` function in a completely different matter
if needed.

Another great thing about Kombo is that side-effects are treated as first class citizens. The basic
"redux" pattern looks pure and cool but without side-effects, it is practically impossible to write
a useful application. In Redux, there must be a plug-in installed to achieve that. In Kombo, you
just write a handler for a side-effect:

```ts
this.addActionHandler(
    'FORM_SUBMIT',
    (state, action) => { // the "reduce" part
        state.isBusy = true;
    },
    (state, action, dispatch) => { // the "side-effect" part (optional)
        ajax$('GET', '/my-service/).subscribe(
            (data) => {
                dispatch({name: 'DATA_LOAD_DONE', payload: {data});
            }
        )
    }
);
```

A side-effect is always invoked *after* the model reduced a respective state based on the action.
Side-effect actions are dispatched at will via a provided function (see `SEDispatcher` type).
In this way it is possible to build chains of asynchronous actions with multiple actions dispatched during different stages of the process.

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


```ts
export class MyStatefulModel extends StatefulModel {

    constructor(dispatcher:ActionDispatcher) {

        this.addActionHandler(
            'GET_DATA',
            action => {
                this.changeState(
                    state => {
                        state.isBusy = true;
                    }
                );
                ajax('GET', '/get-my-data/').subscribe(
                    (data) => {
                        this.changeState(state => {
                            state.data = data;
                            state.isBusy = false;
                        });
                    },
                    (err) => {
                        this.changeState(state => {
                            state.data = null;
                            state.error = err;
                            state.isBusy = false;
                        });
                    }
                );
            }
        );
    }
}
```


<a name="Model synchronization"></a>
 ### Model synchronization

 Model synchronization is necessary when working with multiple models each handling its
 own state. Sooner or later we encounter a situation where a model M1 needs some model M2 to be already
 done with handling action A1. The model M1 may even need some data from M2 (of course without accessing
 its state).

Let's say the model M1 handles a form which also includes some additional subform (backed by the M2
model) with more or less independent logic. Once submitted, the M2 model validates/submits the subform.
But the M1 must wait to M2 to decide whether it should submit the main form.

The  has to wait for some other model (B) to perform an action
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
        this.waitForAction({}, (action:Action, syncData) => { // from now, the function is called on each action
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

    const TodoText:React.FC<{
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

    class TodoTable:React.FC<TodoTableProps> {
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
import { createRoot } from 'react-dom/client';

import {ActionDispatcher, ViewUtils} from 'kombo';
import {init as viewInit} from '../views/todomvc';
import {TodoModel} from '../models/todo';
import { ServerAPI } from '../models/mockapi';


export function init() {
    const dispatcher = new ActionDispatcher();
    const model = new MyModel(dispatcher);
    const viewUtils = new ViewUtils('en_US');
    const component = viewInit(dispatcher, viewUtils, model);
    createRoot(
        document.getElementById('root-mount')
    ).render(
        React.createElement(component.TodoTable),
    );
}
```
