# skeletron

Skeletron is a simple base for client-side application based on React &amp; Rx.JS. It takes some inspiration from Flux architecture and Redux library.

## Key principles

* no boilerplate code (or as few as possible)
* expects model to encapsulate whole business logic (including API calls etc.)
  * model should know what to do with its related state (no actionCreator/store dilemma)
  * stateless model transforms state with possible explicitly defined side effects
  * stateful model is inherently impure and can change itself in any way and decide on its own when to notify change listeners
    (similar to classic event emitter from Flux)
* no action creators (dispatching directly from React components)
* flexible model/state configuration
   * one model -- one state
   * many models -- many states
* view components are always wrapped inside a function allowing runtime dependency injection

### Stateless models

Stateless model does not control when its related state is changed. It only specifies how the state is changed 
in response to different actions (note: do not forget to pass through an original state in case the model does
not respond to an action).

To be able to perform asynchornous API calls, synchronize/notify other possible stores etc., stateless model 
can specify its side effects bound to different actions. These effects are invoked once their respective actions 
reduce the current state.

```ts

export interface MyState {
    userId:number;
    firstname:string;
    lastname:string;
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
                isBusy: false
            },
            (state, action, dispatch) => { // SIDE EFFECTS (run by skeletron after reduce())
                switch (action.type) {
                    case 'REGISTER_USER':
                        // do some (async) stuff
                        // or trigger some other store
                        dispatch({
                            type: 'REGISTER_USER_DONE',
                            payload: {userId: someFetchedInfo['userId']};
                        })
                        
                    break;
                }
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
        }
        return newState;
    }

}
```

### Stateful models

Stateful models are intended mainly for legacy code integration. They control how and when their internal state is changed in response to an action (they must explicitly call *emitChange* to notify their listeners - typically React components - that they should update their state).

```ts
export class MyStatefulModel extends StateFullModel {

    constructor(dispatcher:ActionDispatcher) {
        dispatcher.register(action => {
            switch (action.type) {
                case 'GET_DATA':
                    this.isBusy = true;
                    this.emitChange();
                    this.ajax(...).then(
                        (data) => {
                            this.data = data;
                            this.emitChange();
                        },
                        (err) => {
                            this.data = null;
                            this.error = err;
                            this.emitChange();
                        }
                    )
                break;
            }
        });
    }
}

### View module

```tsx
import * as React from 'react';
import {Connected} from '../core/components';
import { ActionDispatcher } from '../core/main';
import {ViewUtils} from '../core/l10n';

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
      TodoTable: Connected<TodoState>(TodoTable, model)
    }
}
```
