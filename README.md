# skeletron
A simple base for client-side application based on React &amp; Rx.JS

## Key principles

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


### View module

```tsx

export function init(dispatcher:ActionDispatcher, model:TodoModel) {

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

        return <input type="text" value={props.text} onChange={handleInputChange}
                    placeholder="my new task" disabled={props.complete} />;
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
